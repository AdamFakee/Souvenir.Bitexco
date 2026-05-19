import { ViceService } from '@/screens/vice-service'
import { Button, LoadingIndicator, ModalBase } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { BitexcoReceiptTemplate } from '@/shared/features/order/components/bitexco-receipt-template'
import { formatCurrency } from '@/shared/utils'
import { useActorRef, useSelector } from '@xstate/react'
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Database,
  Printer,
  Wifi,
} from 'lucide-react-native'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { PaymentMethod } from '@/shared/lib/database'
import {
  getPortablePaymentStatusLabel,
  portablePaymentMachine,
} from '../machines/portable-payment.machine'
import { PaymentPopupProps, PaymentPopupRef } from '../types'
import { calculateSubtotal, calculateTotalTax } from '../utils'

const MAX_RETRIES = 3

/**
 * Popup Thanh Toán Thẻ qua máy POS di động Ingenico - Được điều phối bởi `portablePaymentMachine`
 */
export const PortablePaymentPopup = forwardRef<PaymentPopupRef, PaymentPopupProps>(
  (
    {
      total,
      discount,
      items,
      staffId,
      shiftId,
      staffName,
      appliedVoucher,
      activeSessionId,
      printRef,
      onSuccess,
    },
    ref,
  ) => {
    const [visible, setVisible] = useState(false)

    // Khởi tạo và thiết lập machine cùng với override actions thông báo cho người dùng
    const actorRef = useActorRef(portablePaymentMachine, {
      input: {
        total,
        discount,
        items,
        staffId,
        shiftId,
        sessionId: activeSessionId ?? 'unknown',
        appliedVoucher: appliedVoucher || null,
        printRef,
      },
    })

    // --- XState Selectors ---
    const machineState = useSelector(actorRef, (s) => s.value)
    const error = useSelector(actorRef, (s) => s.context.error)
    const retryCount = useSelector(actorRef, (s) => s.context.retryCount)
    const savedOrder = useSelector(actorRef, (s) => s.context.savedOrder)
    const orderId = useSelector(actorRef, (s) => s.context.orderId)
    const referenceCode = useSelector(actorRef, (s) => s.context.referenceCode)

    // Trạng thái cụ thể để điều khiển UI
    const isIdle = machineState === 'idle'
    const isCreatingPending = machineState === 'creatingPendingOrder'
    const isConnecting = machineState === 'connecting'
    const isConnectionFailed = machineState === 'connectionFailed'
    const isSendingCommand = machineState === 'sendingCommand'
    const isVerifyingUnknown = machineState === 'verifyingUnknown'
    const isPaymentFailed = machineState === 'paymentFailed'
    const isCanceling = machineState === 'cancelingOrder'
    const isUpdatingOrder = machineState === 'updatingOrder'
    const isManualResolution = machineState === 'manualResolution'
    const isPreparingReceipt = machineState === 'preparingReceipt'
    const isPrinting = machineState === 'printingReceipt'
    const isSuccess = machineState === 'success'

    const isLoading =
      isCreatingPending ||
      isConnecting ||
      isSendingCommand ||
      isVerifyingUnknown ||
      isCanceling ||
      isUpdatingOrder ||
      isPreparingReceipt ||
      isPrinting

    // Kiểm tra khả năng tương tác (Đăng ký bộ lắng nghe Reactive Selector theo đúng chuẩn FSM)
    const canRetry = useSelector(actorRef, (s) => s.can({ type: 'RETRY' }))
    const canCancel = useSelector(actorRef, (s) => s.can({ type: 'CANCEL' }))

    // Việt hóa trạng thái tiến trình
    const statusLabel = getPortablePaymentStatusLabel(actorRef.getSnapshot())

    // --- Phân chia Bước Tiến Trình (Visual Step Indicator) ---
    // Bước 0: Khởi tạo, Bước 1: Kết nối POS, Bước 2: Quẹt thẻ, Bước 3: Hoàn tất & In bill
    let activeStep = 0
    if (isConnecting || isConnectionFailed) {
      activeStep = 1
    } else if (isSendingCommand || isPaymentFailed || isVerifyingUnknown) {
      activeStep = 2
    } else if (
      isUpdatingOrder ||
      isManualResolution ||
      isPreparingReceipt ||
      isPrinting ||
      isSuccess
    ) {
      activeStep = 3
    }

    // --- Đồng bộ Vice Screen (Màn hình phụ khách hàng) ---
    useEffect(() => {
      if (!visible) return
      const subtotal = calculateSubtotal(items)
      const tax = calculateTotalTax(items)

      if (isSuccess) {
        ViceService.paymentSuccess({
          subtotal,
          discount,
          tax,
          total,
          customerPaid: total,
          change: 0,
        })
      } else {
        // Hiển thị trạng thái đang xử lý quẹt thẻ trên màn phụ
        ViceService.showPortablePayment()
      }
    }, [visible, isSuccess, items, discount, total])

    // --- Đóng mở Popup & Xử lý vòng đời ---
    useImperativeHandle(ref, () => ({
      open: () => {
        setVisible(true)
        const freshInput = {
          total,
          discount,
          items,
          staffId,
          shiftId,
          sessionId: activeSessionId ?? 'unknown',
          appliedVoucher: appliedVoucher || null,
          printRef,
        }
        // Khởi động lại machine từ đầu
        actorRef.send({ type: 'START', input: freshInput })
        // Tự động kích hoạt luồng thanh toán từ Idle
        setTimeout(() => {
          actorRef.send({ type: 'CONFIRM' })
        }, 300)
      },
      close: () => {
        actorRef.send({ type: 'CANCEL' })
      },
    }))

    // Thành công -> Báo chuông thành công, đóng popup sau 1.8 giây trì hoãn
    useEffect(() => {
      if (!isSuccess) return
      const subtotal = calculateSubtotal(items)
      const tax = calculateTotalTax(items)
      ViceService.paymentSuccess({
        subtotal,
        discount,
        tax,
        total,
        customerPaid: total,
        change: 0,
      })

      const timer = setTimeout(() => {
        setVisible(false)
        onSuccess({
          success: true,
          method: PaymentMethod.CARD,
          paidAmount: total,
          change: 0,
          referenceCode: referenceCode ?? orderId ?? undefined,
          isOnline: !isManualResolution,
          orderId: orderId ?? undefined,
        })
      }, 1800)
      return () => clearTimeout(timer)
    }, [isSuccess])

    const handleCancel = () => {
      actorRef.send({ type: 'CANCEL' })
      // Nếu không có orderId (tức là chưa lưu đơn PENDING thành công), đóng popup ngay
      if (!orderId) {
        setVisible(false)
      }
    }

    // Đóng hoàn tất khi trạng thái hủy đơn DB hoàn tất (trở về idle sau khi CancelingOrder kết thúc)
    useEffect(() => {
      if (isIdle && visible && !isLoading && orderId === null) {
        const timer = setTimeout(() => setVisible(false), 500)
        return () => clearTimeout(timer)
      }
    }, [isIdle, visible, isLoading, orderId])

    const handleRetry = () => {
      actorRef.send({ type: 'RETRY' })
    }

    const handleForceComplete = () => {
      actorRef.send({ type: 'FORCE_COMPLETE' })
    }

    console.log(error)

    const handleRetryUpdate = () => {
      actorRef.send({ type: 'RETRY_UPDATE' })
    }

    // Render vòng tròn chỉ báo bước
    const renderStepCircle = (stepIdx: number, stepLabel: string) => {
      const isCompleted = activeStep > stepIdx
      const isActive = activeStep === stepIdx
      const isFailed = (isConnectionFailed && stepIdx === 1) || (isPaymentFailed && stepIdx === 2)

      let bgClass = 'bg-surface-200 border-surface-300'
      let textClass = 'text-surface-onVariant'
      if (isCompleted) {
        bgClass = 'bg-green-100 border-green-500'
        textClass = 'text-green-700'
      } else if (isActive) {
        bgClass = isFailed ? 'bg-error/10 border-error' : 'bg-primary/10 border-primary'
        textClass = isFailed ? 'text-error' : 'text-primary'
      }

      return (
        <View className="flex-1 flex-col items-center">
          <View
            className={`h-16 w-16 items-center justify-center rounded-full border-2 ${bgClass}`}
          >
            {isCompleted ? (
              <CheckCircle size={28} color="#22c55e" />
            ) : isActive && isLoading ? (
              <LoadingIndicator size={28} color={COLORS.primary.default} />
            ) : isFailed ? (
              <AlertCircle size={28} color={COLORS.error.default} />
            ) : (
              <Text className={`text-xl font-bold ${textClass}`}>{stepIdx + 1}</Text>
            )}
          </View>
          <Text
            className={`mt-3 text-center text-sm font-semibold ${
              isActive ? 'font-black text-surface-on' : 'text-surface-onVariant'
            }`}
          >
            {stepLabel}
          </Text>
        </View>
      )
    }

    return (
      <ModalBase
        visible={visible}
        onClose={handleCancel}
        dismissible={!isLoading && !isManualResolution}
        className="max-w-[920px] overflow-hidden rounded-[32px]"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-outline-variant bg-surface-50 px-8 py-5">
          <View className="flex-row items-center gap-3">
            <CreditCard size={28} color={COLORS.primary.default} />
            <Text className="text-2xl font-black text-surface-on">Thanh toán Thẻ qua máy POS</Text>
          </View>
          {isVerifyingUnknown && (
            <View className="rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5">
              <Text className="animate-pulse text-xs font-black uppercase tracking-widest text-amber-600">
                Reconciliation Mode
              </Text>
            </View>
          )}
        </View>

        <ScrollView className="bg-surface-100" showsVerticalScrollIndicator={false}>
          {/* Main Info Row */}
          <View className="flex-row border-b border-outline-variant">
            {/* Left Box: Bill Details */}
            <View className="flex-[4] justify-center border-r border-outline-variant bg-surface-50 p-8">
              <View className="mb-6">
                <Text className="text-surface-onVariant mb-1.5 text-xs font-black uppercase tracking-wider">
                  Tổng tiền quẹt POS
                </Text>
                <Text className="text-4xl font-black tracking-tighter text-primary">
                  {formatCurrency(total)}
                </Text>
              </View>

              <View className="shadow-inner gap-4 rounded-[20px] border border-outline-variant bg-surface-100 p-5">
                <View>
                  <Text className="text-surface-onVariant mb-0.5 text-xs">Mã hóa đơn tạm</Text>
                  <Text className="text-base font-bold text-surface-on">
                    {orderId ?? 'Đang tạo...'}
                  </Text>
                </View>
                <View>
                  <Text className="text-surface-onVariant mb-0.5 text-xs">
                    Mã tham chiếu (Ingenico)
                  </Text>
                  <Text className="text-base font-bold text-surface-on">
                    {referenceCode ?? 'Đang chờ giao dịch...'}
                  </Text>
                </View>
                {retryCount > 0 && (
                  <View className="flex-row items-center gap-1.5 rounded-lg border border-error/10 bg-error/5 px-2.5 py-1.5">
                    <AlertCircle size={14} color={COLORS.error.default} />
                    <Text className="text-xs font-bold text-error">
                      Lần quẹt lại thứ: {retryCount} / {MAX_RETRIES}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Right Box: Status Feedback */}
            <View className="min-h-[340px] flex-[6] flex-col items-center justify-center bg-white p-8">
              {isSuccess ? (
                <View className="items-center justify-center">
                  <View className="h-24 w-24 items-center justify-center rounded-full bg-green-100 p-2 shadow-lg shadow-green-500/20">
                    <CheckCircle size={64} color="#22c55e" />
                  </View>
                  <Text className="mt-5 text-center text-2xl font-black text-green-600">
                    Quẹt thẻ thành công!
                  </Text>
                  <Text className="text-surface-onVariant mt-2 text-center text-sm">
                    Đã thanh toán {formatCurrency(total)}
                  </Text>
                </View>
              ) : isConnectionFailed || isPaymentFailed ? (
                <View className="items-center justify-center px-4">
                  <View className="shadow-inner h-20 w-20 items-center justify-center rounded-full border border-error/20 bg-error/10 p-2">
                    <AlertCircle size={48} color={COLORS.error.default} />
                  </View>
                  <Text className="mt-4 text-center text-xl font-bold text-error">
                    {isConnectionFailed ? 'Lỗi kết nối máy POS!' : 'Giao dịch thất bại!'}
                  </Text>
                  <Text className="text-surface-onVariant mt-2 text-center text-sm">
                    {error ?? 'Vui lòng kiểm tra cáp socket / thẻ quẹt và thử lại.'}
                  </Text>
                </View>
              ) : isManualResolution ? (
                <View className="items-center justify-center px-4">
                  <View className="h-20 w-20 items-center justify-center rounded-full border border-amber-200 bg-amber-100 p-2">
                    <Database size={48} color="#d97706" />
                  </View>
                  <Text className="mt-4 text-center text-lg font-bold text-amber-600">
                    Lỗi SQLite: Mất đồng bộ cơ sở dữ liệu!
                  </Text>
                  <Text className="text-surface-onVariant mt-2 text-center text-xs">
                    Giao dịch đã báo quẹt thành công trên POS nhưng không thể cập nhật DB SQLite.
                    Vui lòng nhấn Xác nhận tay nếu thấy máy POS báo SALE SUCCESS.
                  </Text>
                </View>
              ) : (
                <View className="items-center justify-center">
                  <View className="mb-6 h-24 w-24 items-center justify-center rounded-full border border-primary/10 bg-primary/5 shadow-sm">
                    {isConnecting ? (
                      <Wifi size={44} color={COLORS.primary.default} />
                    ) : isPreparingReceipt || isPrinting ? (
                      <Printer size={44} color={COLORS.primary.default} />
                    ) : (
                      <CreditCard size={44} color={COLORS.primary.default} />
                    )}
                  </View>
                  <View className="flex-row items-center gap-2 rounded-full border border-surface-200 bg-surface-100 px-5 py-2.5 shadow-sm">
                    {isLoading && <LoadingIndicator size={16} />}
                    <Text className="text-surface-onVariant text-xs font-semibold uppercase tracking-wider">
                      {statusLabel}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Interactive Steps indicators */}
          <View className="flex-row items-center justify-between border-b border-outline-variant bg-surface-50 px-8 py-8">
            {renderStepCircle(0, 'Khởi tạo')}
            <ChevronRight size={20} color={COLORS.outline.variant} className="mb-8" />
            {renderStepCircle(1, 'Kết nối POS')}
            <ChevronRight size={20} color={COLORS.outline.variant} className="mb-8" />
            {renderStepCircle(2, 'Quẹt thẻ')}
            <ChevronRight size={20} color={COLORS.outline.variant} className="mb-8" />
            {renderStepCircle(3, 'Hoàn tất & In')}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View className="flex-row-reverse gap-4 border-t border-outline-variant bg-surface-50 px-8 py-5">
          {isConnectionFailed && (
            <Button
              label="Thử kết nối lại"
              variant="primary"
              disabled={!canRetry}
              onPress={handleRetry}
              className="h-14 flex-1 rounded-2xl"
              textClassName="text-base font-black"
            />
          )}

          {isPaymentFailed && (
            <Button
              label="Quẹt lại thẻ"
              variant="primary"
              disabled={!canRetry}
              onPress={handleRetry}
              className="h-14 flex-1 rounded-2xl"
              textClassName="text-base font-black"
            />
          )}

          {isManualResolution && (
            <>
              <Button
                label="Xác nhận tay (Force Complete)"
                variant="primary"
                onPress={handleForceComplete}
                className="h-14 flex-1 rounded-2xl"
                textClassName="text-base font-black"
              />
              <Button
                label="Thử lại ghi DB"
                variant="outline"
                onPress={handleRetryUpdate}
                className="h-14 rounded-2xl px-6"
                textClassName="text-base font-black"
              />
            </>
          )}

          <Button
            label={isManualResolution ? 'Đóng sự cố' : 'Hủy giao dịch'}
            variant="outline"
            disabled={!canCancel && !isConnectionFailed && !isPaymentFailed && !isManualResolution}
            onPress={handleCancel}
            className="h-14 rounded-2xl px-8"
            textClassName="text-base font-black"
          />
        </View>

        {/* Hidden Printer Template */}
        <View style={{ position: 'absolute', left: -2000, top: 0 }}>
          {savedOrder && (
            <View collapsable={false} ref={printRef}>
              <BitexcoReceiptTemplate
                order={
                  {
                    ...savedOrder,
                    id: savedOrder.id,
                    total: total,
                    totalTax: calculateTotalTax(items),
                    itemsSnapshot: items.map((i) => ({
                      sku: i.product.sku,
                      name: i.product.nameEn,
                      price: i.product.price,
                      quantity: i.quantity,
                      subtotal: i.product.price * i.quantity,
                      taxRate: i.product.taxRate || 0,
                      taxAmount: i.product.price * i.quantity * ((i.product.taxRate || 0) / 100),
                    })),
                    paymentsSnapshot: [
                      {
                        method: PaymentMethod.CARD,
                        amount: total,
                      },
                    ],
                  } as any
                }
                staffName={staffName}
              />
            </View>
          )}
        </View>
      </ModalBase>
    )
  },
)

PortablePaymentPopup.displayName = 'PortablePaymentPopup'
export default PortablePaymentPopup
