import { ViceService } from '@/screens/vice-service'
import { Button, LoadingIndicator, ModalBase } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { BitexcoReceiptTemplate } from '@/shared/features/order/components/bitexco-receipt-template'
import { formatCurrency } from '@/shared/utils'
import { toast } from '@/shared/store/use-alert-store'
import { useActorRef, useSelector } from '@xstate/react'
import { AlertCircle, CheckCircle, QrCode } from 'lucide-react-native'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { PaymentMethod } from '@/shared/lib/database'
import { getQrPaymentStatusLabel, qrPaymentMachine } from '../machines/qr-payment.machine'
import { PaymentPopupProps, PaymentPopupRef } from '../types'
import { calculateSubtotal, calculateTotalTax } from '../utils'

/**
 * Popup thanh toán QR — driven by `qrPaymentMachine`.
 */
export const QrPaymentPopup = forwardRef<PaymentPopupRef, PaymentPopupProps>(
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

    // Khởi tạo machine với toàn bộ input cần thiết
    const actorRef = useActorRef(
      qrPaymentMachine.provide({
        actions: {
          notifyTimeout: () => {
            toast.error('Giao dịch đã hết hạn thanh toán (10 phút)')
          },
          notifyCancel: () => {
            toast.info('Giao dịch đã bị hủy')
          },
        },
      }),
      {
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
      },
    )

    // --- Selectors ---
    const machineState = useSelector(actorRef, (s) => s.value)
    const qrContent = useSelector(actorRef, (s) => s.context.qrContent)
    const billNumber = useSelector(actorRef, (s) => s.context.billNumber)
    const error = useSelector(actorRef, (s) => s.context.error)
    const retryCount = useSelector(actorRef, (s) => s.context.retryCount)
    const savedOrder = useSelector(actorRef, (s) => s.context.savedOrder)

    // Trạng thái tổng hợp
    const isSuccess = machineState === 'success'
    const isError = machineState === 'error'
    const isCancelled = machineState === 'cancelled'
    const isCreatingOrder = machineState === 'creatingOrder'
    const isFetchingQR = machineState === 'fetchingQR'
    const isWaiting = typeof machineState === 'object' && 'waitingForPayment' in machineState
    const isSaving = machineState === 'savingOrder'
    const isPrinting = machineState === 'printingReceipt'

    const isLoading = isCreatingOrder || isFetchingQR || isWaiting || isSaving || isPrinting

    // guard can()
    const canRetry = actorRef.getSnapshot().can({ type: 'RETRY' })
    const canCancel = actorRef.getSnapshot().can({ type: 'CANCEL' })

    // Status label
    const statusLabel = getQrPaymentStatusLabel(actorRef.getSnapshot())

    // Cập nhật Vice Screen khi QR sẵn sàng
    useEffect(() => {
      if (!qrContent || !visible) return
      const subtotal = calculateSubtotal(items)
      const tax = calculateTotalTax(items)
      ViceService.showPayment({ qrCodeUrl: qrContent, subtotal, discount, tax, total })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qrContent, visible])

    // Khi machine thành công → trigger onSuccess và đóng popup
    useEffect(() => {
      if (!isSuccess) return

      const subtotal = calculateSubtotal(items)
      const tax = calculateTotalTax(items)
      ViceService.paymentSuccess({ subtotal, discount, tax, total, customerPaid: total, change: 0 })

      const snap = actorRef.getSnapshot()
      const resolvedOrderId = snap.context.orderId ?? snap.context.sessionId
      const resolvedBillNumber = snap.context.billNumber ?? resolvedOrderId

      // Đợi để khách thấy UI success trước khi đóng
      setTimeout(() => {
        setVisible(false)
        onSuccess({
          success: true,
          method: PaymentMethod.BANK_TRANSFER,
          paidAmount: total,
          change: 0,
          referenceCode: resolvedBillNumber,
          isOnline: true,
          orderId: resolvedOrderId,
        })
      }, 1500)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuccess])

    // Khi cancelled → đóng popup sau một khoảng trễ ngắn để kịp xử lý DB
    useEffect(() => {
      if (isCancelled) {
        const timer = setTimeout(() => setVisible(false), 800)
        return () => clearTimeout(timer)
      }
    }, [isCancelled])

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

        // Khởi động lại machine với dữ liệu mới nhất
        actorRef.send({ type: 'START', input: freshInput })
      },
      close: () => {
        actorRef.send({ type: 'CANCEL' })
      },
    }))

    const handleCancel = () => {
      actorRef.send({ type: 'CANCEL' })
      // Không setVisible(false) ở đây, để useEffect xử lý sau khi machine chuyển trạng thái
    }

    const handleRetry = () => {
      actorRef.send({ type: 'RETRY' })
    }

    return (
      <ModalBase
        visible={visible}
        onClose={handleCancel}
        dismissible={!isLoading}
        className="max-w-[860px]"
      >
        {/* Header */}
        <View className="border-b border-outline-variant bg-surface-50 px-6 py-4">
          <Text className="text-2xl font-bold text-surface-on">Thanh toán QR code</Text>
        </View>

        {/* Content */}
        <View className="flex-row bg-surface-100">
          {/* Thông tin đơn */}
          <View className="flex-[4] justify-center border-r border-outline-variant p-8">
            <View className="mb-8">
              <Text className="text-surface-onVariant mb-2 text-sm font-semibold uppercase tracking-wider">
                Cần thanh toán
              </Text>
              <Text className="text-5xl font-black text-primary">{formatCurrency(total)}</Text>
            </View>

            <View className="gap-6 rounded-2xl border border-outline-variant bg-surface-50 p-6">
              <View>
                <Text className="text-surface-onVariant mb-1 text-sm">Mã hóa đơn</Text>
                <Text className="text-lg font-bold text-surface-on">
                  {billNumber ?? 'Đang tạo...'}
                </Text>
              </View>
              <View>
                <Text className="text-surface-onVariant mb-1 text-sm">Mã giỏ hàng</Text>
                <Text className="text-lg font-bold text-surface-on">
                  {activeSessionId || 'N/A'}
                </Text>
              </View>
              {/* Retry count indicator */}
              {isError && retryCount > 0 && (
                <View>
                  <Text className="text-xs text-error">Lần thử: {retryCount} / 3</Text>
                </View>
              )}
            </View>
          </View>

          {/* QR & Trạng thái */}
          <View className="flex-[6] flex-col items-center justify-center bg-white p-12">
            <View className="mb-8 rounded-[32px] border-[8px] border-primary/10 bg-white p-6 shadow-2xl shadow-primary/20">
              {isSuccess ? (
                <View className="h-[240px] w-[240px] items-center justify-center">
                  <CheckCircle size={80} color="#22c55e" />
                  <Text className="mt-4 text-center text-xl font-bold text-green-600">
                    Đã nhận tiền!
                  </Text>
                </View>
              ) : isError ? (
                <View className="h-[240px] w-[240px] items-center justify-center p-4">
                  <AlertCircle size={64} color="#ef4444" />
                  <Text className="mt-4 text-center text-sm text-red-500">{error}</Text>
                  {!canRetry && (
                    <Text className="mt-2 text-center text-xs text-error/70">
                      Đã hết lần thử lại
                    </Text>
                  )}
                </View>
              ) : qrContent ? (
                <QRCode value={qrContent} size={240} />
              ) : (
                <View className="h-[240px] w-[240px] items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant bg-surface-100">
                  <QrCode size={64} color={COLORS.surface.onVariant} />
                  <Text className="mt-4 px-4 text-center font-medium text-surface-on-variant">
                    {isLoading ? 'Hệ thống đang chuẩn bị mã QR...' : 'Vui lòng thử lại'}
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center gap-3 rounded-full border border-surface-200 bg-surface-100 px-6 py-3">
              {isLoading && <LoadingIndicator />}
              <Text className="text-surface-onVariant font-semibold tracking-wide">
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="flex-row-reverse gap-4 border-t border-outline-variant bg-surface-50 px-6 py-4">
          {/* Thử lại — disabled bằng guard canRetry */}
          {isError && (
            <Button
              label="Thử lại"
              variant="primary"
              disabled={!canRetry}
              onPress={handleRetry}
              className="h-14 flex-1"
            />
          )}
          <Button
            label="Hủy giao dịch"
            variant="outline"
            disabled={!canCancel && !isError}
            onPress={handleCancel}
            className="h-14 px-8"
          />
        </View>

        {/* Hidden Printer Template — Rendered inside popup using real saved data */}
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
                        method: 'BANK_TRANSFER',
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

QrPaymentPopup.displayName = 'QrPaymentPopup'
export default QrPaymentPopup
