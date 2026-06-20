import { ViceService } from '@/screens/vice-service'
import { Button, ModalBase, Shimmer } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAppContext } from '@/shared/features/app/hooks/use-app-context'
import { BitexcoReceiptTemplate } from '@/shared/features/order/components/bitexco-receipt-template'

import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import NetInfo from '@react-native-community/netinfo'
import { useActorRef, useSelector } from '@xstate/react'
import { AlertCircle, CheckCircle, Clock3, QrCode } from 'lucide-react-native'
import React, { forwardRef, useEffect, useImperativeHandle, useState, memo } from 'react'
import { Image, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { getQrPaymentStatusLabel, qrPaymentMachine } from '../machines/qr-payment.machine'
import { PAYMENT_ERROR_CODES, PaymentPopupProps, PaymentPopupRef } from '../types'
import { calculateSubtotal, calculateTotalTax } from '../utils'

/**
 * Popup thanh toán QR — driven by `qrPaymentMachine`.
 */
export const QrPaymentPopup = memo(
  forwardRef<PaymentPopupRef, PaymentPopupProps>(
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
      const [timeLeft, setTimeLeft] = useState('05:00')
      const { tenantConfig } = useAppContext()

      const subtotal = calculateSubtotal(items)
      const tax = calculateTotalTax(items)

      const actorRef = useActorRef(qrPaymentMachine, {
        input: {
          total,
          discount,
          items,
          staffId,
          shiftId,
          sessionId: activeSessionId ?? 'unknown',
          appliedVoucher: appliedVoucher || null,
          printRef,
          tenantConfig,
        },
      })

      const machineState = useSelector(actorRef, (s) => s.value)
      const qrContent = useSelector(actorRef, (s) => s.context.qrContent)
      const expiresAt = useSelector(actorRef, (s) => s.context.expiresAt)
      const billNumber = useSelector(actorRef, (s) => s.context.billNumber)
      const error = useSelector(actorRef, (s) => s.context.error)
      const errorCode = useSelector(actorRef, (s) => s.context.errorCode)
      const retryCount = useSelector(actorRef, (s) => s.context.retryCount)
      const savedOrder = useSelector(actorRef, (s) => s.context.savedOrder)
      const statusLabel = useSelector(actorRef, getQrPaymentStatusLabel)

      const canRetry = useSelector(actorRef, (s) => s.can({ type: 'RETRY' }))
      const canCancel = useSelector(actorRef, (s) => s.can({ type: 'CANCEL' }))

      const isSuccess = machineState === 'success'
      const isError = machineState === 'error'
      const isCancelled = machineState === 'cancelled'
      const isCreatingOrder = machineState === 'creatingOrder'
      const isFetchingQR = machineState === 'fetchingQR'
      const isWaiting = typeof machineState === 'object' && 'waitingForPayment' in machineState
      const isSaving = machineState === 'savingOrder'
      const isPrinting = machineState === 'printingReceipt'

      const isLoading = isCreatingOrder || isFetchingQR || isWaiting || isSaving || isPrinting

      const statusPillClassName = isSuccess
        ? 'border-success/20 bg-success/10'
        : isError
          ? 'border-error/20 bg-error/10'
          : 'border-outline-variant bg-white'

      const statusTextClassName = isSuccess
        ? 'text-success'
        : isError
          ? 'text-error'
          : 'text-neutral-700'

      useEffect(() => {
        if (!visible) return
        if (isError) {
          if (errorCode === PAYMENT_ERROR_CODES.TIMEOUT) {
            ViceService.showStatus({
              type: 'error',
              title: 'Hết thời gian thanh toán',
              message: 'Vui lòng chờ nhân viên thao tác',
            })
          } else {
            ViceService.showStatus({
              type: 'error',
              title: 'Thanh toán thất bại',
              message: 'Đã xảy ra lỗi hệ thống.',
            })
          }
        } else if (qrContent) {
          ViceService.showPayment({ qrCodeUrl: qrContent, subtotal, discount, tax, total })
        }
      }, [qrContent, visible, subtotal, discount, tax, total, isError, errorCode, error])

      useEffect(() => {
        if (!visible && !isSuccess) {
          ViceService.updateCart({
            items: items.map((i) => ({
              id: i.id,
              name: i.product.name,
              price: i.price,
              quantity: i.quantity,
            })),
            subtotal,
            discount,
            tax,
            total,
          })
        }
      }, [visible, isSuccess, items, subtotal, discount, tax, total])

      useEffect(() => {
        if (!isSuccess || !visible) return

        ViceService.paymentSuccess({
          subtotal,
          discount,
          tax,
          total,
          customerPaid: total,
          change: 0,
        })

        const snap = actorRef.getSnapshot()
        const resolvedOrderId = snap.context.orderId ?? snap.context.sessionId
        const resolvedBillNumber = snap.context.billNumber ?? resolvedOrderId

        const timer = setTimeout(() => {
          setVisible(false)
          onSuccess({
            success: true,
            method: 'qr_bidv',
            paidAmount: total,
            change: 0,
            referenceCode: resolvedBillNumber,
            isOnline: true,
            orderId: resolvedOrderId,
          })
        }, 1500)

        return () => clearTimeout(timer)
      }, [actorRef, isSuccess, visible, subtotal, discount, tax, total, onSuccess])

      useEffect(() => {
        if (isCancelled) {
          const timer = setTimeout(() => setVisible(false), 800)
          return () => clearTimeout(timer)
        }
      }, [isCancelled])

      useEffect(() => {
        if (!visible || !qrContent) {
          setTimeLeft('05:00')
          return
        }

        const updateTimer = () => {
          if (!expiresAt) {
            setTimeLeft('05:00')
            return
          }

          const expiryTime = new Date(expiresAt).getTime()
          const now = Date.now()
          const diffMs = expiryTime - now

          if (diffMs <= 0) {
            setTimeLeft('00:00')
            return
          }

          const totalSecs = Math.floor(diffMs / 1000)
          const mins = Math.floor(totalSecs / 60)
          const secs = totalSecs % 60
          const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
          setTimeLeft(formatted)
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)
        return () => clearInterval(interval)
      }, [visible, qrContent, expiresAt])

      useImperativeHandle(
        ref,
        () => ({
          open: async () => {
            const netState = await NetInfo.fetch()
            if (!netState.isConnected) {
              toast.error('Thanh toán QR yêu cầu kết nối mạng!')
              return
            }

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
              tenantConfig,
            }

            actorRef.send({ type: 'START', input: freshInput })
          },
          close: () => {
            actorRef.send({ type: 'CANCEL' })
          },
        }),
        [
          activeSessionId,
          actorRef,
          appliedVoucher,
          discount,
          items,
          printRef,
          shiftId,
          staffId,
          tenantConfig,
          total,
        ],
      )

      const handleCancel = () => {
        toast.confirm({
          title: 'Xác nhận hủy giao dịch',
          message: 'Bạn có chắc chắn muốn hủy giao dịch thanh toán QR này không?',
          onConfirm: () => actorRef.send({ type: 'CANCEL' }),
        })
      }

      const handleRetry = () => {
        actorRef.send({ type: 'RETRY' })
      }

      const handleCheckStatusNow = () => {
        actorRef.send({ type: 'CHECK_STATUS_NOW' })
      }

      const handleForceComplete = () => {
        toast.confirm({
          title: 'Xác nhận thanh toán thủ công',
          message:
            'Bạn có chắc chắn muốn xác nhận khách đã chuyển khoản thành công và ghi nhận đơn hàng này không?',
          onConfirm: () => actorRef.send({ type: 'FORCE_COMPLETE' }),
        })
      }

      const receiptOrder = savedOrder
        ? ({
            ...savedOrder,
            id: savedOrder.id,
            total,
            subtotal,
            discount,
            totalTax: tax,
            itemsSnapshot: items.map((i) => ({
              sku: i.product.sku,
              name: i.product.name,
              price: i.product.price,
              quantity: i.quantity,
              subtotal: i.product.price * i.quantity,
              taxRate: i.product.taxRate || 0,
              taxAmount: i.product.price * i.quantity * ((i.product.taxRate || 0) / 100),
            })),
            paymentsSnapshot: [
              {
                method: 'qr_bidv',
                amount: total,
              },
            ],
          } as any)
        : null

      const renderQrStage = () => {
        if (isSuccess) {
          return (
            <View className="items-center justify-center px-4 py-8">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-success/10">
                <CheckCircle size={52} color="#00944a" />
              </View>
              <Text className="mt-5 text-center text-2xl font-bold text-success">Đã nhận tiền</Text>
              <Text className="mt-2 max-w-[280px] text-center text-sm leading-6 text-neutral-600">
                Đang hoàn tất hóa đơn và in biên lai.
              </Text>
            </View>
          )
        }

        if (isError) {
          return (
            <View className="items-center justify-center px-4 py-8">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-error/10">
                <AlertCircle size={52} color="#dd2027" />
              </View>
              <Text className="mt-5 text-center text-2xl font-bold text-error">
                Thanh toán chưa hoàn tất
              </Text>
              <Text className="mt-2 max-w-[300px] text-center text-sm leading-6 text-neutral-600">
                {error ?? 'Vui lòng thử lại.'}
              </Text>
              {retryCount > 0 && (
                <Text className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-error">
                  Lần thử {retryCount} / 3
                </Text>
              )}
            </View>
          )
        }

        if (qrContent) {
          const isUrl = qrContent.startsWith('http')
          return (
            <View className="items-center justify-center px-4 py-6">
              <View className="rounded-[22px] border border-surface-200 bg-white p-4 shadow-sm">
                {isUrl ? (
                  <Image
                    source={{ uri: qrContent }}
                    style={{ width: 240, height: 240 }}
                    resizeMode="contain"
                  />
                ) : (
                  <QRCode value={qrContent} size={240} color="black" backgroundColor="white" />
                )}
              </View>
              <Text className="mt-4 text-center text-lg font-bold text-neutral-800">
                Đang chờ thanh toán QR
              </Text>
              <View className="mt-3 flex-row items-center gap-2 rounded-full border border-orange-300 bg-white px-4 py-2">
                <Clock3 size={18} color="#fb8c00" />
                <Text className="text-xl font-black tracking-[1px] text-[#fb8c00]">{timeLeft}</Text>
              </View>
              <Text className="mt-2 max-w-[300px] text-center text-xl leading-6 text-neutral-600">
                Sau khi thanh toán, vui lòng chờ trong giây lát để hệ thống xác nhận.
              </Text>
            </View>
          )
        }

        return (
          <View className="items-center justify-center px-4 py-6">
            <View className="flex h-[220px] w-[220px] items-center justify-center overflow-hidden rounded-[22px] border border-surface-200 bg-surface-100 shadow-sm">
              {isLoading ? (
                <Shimmer className="h-[160px] w-[160px] rounded-[18px]" />
              ) : (
                <View className="h-[160px] w-[160px] items-center justify-center rounded-[18px] bg-white">
                  <QrCode size={72} color={COLORS.surface.onVariant} />
                </View>
              )}
            </View>
            <Text className="mt-4 text-center text-lg font-bold text-neutral-800">
              Đang chờ thanh toán QR
            </Text>
            <View className="mt-3 flex-row items-center gap-2 rounded-full border border-orange-300 bg-white px-4 py-2">
              <Clock3 size={18} color="#fb8c00" />
              <Text className="text-xl font-black tracking-[1px] text-[#fb8c00]">--:--</Text>
            </View>
          </View>
        )
      }

      return (
        <ModalBase
          visible={visible}
          onClose={handleCancel}
          dismissible={!isLoading}
          className="max-w-[600px] overflow-hidden rounded-[28px] bg-surface-50"
        >
          {visible && (
            <>
              <View className="bg-surface-50 px-6 pb-4 pt-4">
                <View className="overflow-hidden rounded-[32px] border border-surface-200 bg-white px-6 py-6 shadow-sm">
                  <View className="items-center">{renderQrStage()}</View>
                </View>

                <View className="mx-auto mt-4 w-full rounded-[24px] border border-surface-200 bg-white px-6 py-5 shadow-sm">
                  <View className="flex-row items-center justify-between py-2">
                    <Text className="text-lg font-semibold text-neutral-600">Tạm tính</Text>
                    <Text className="text-lg font-semibold text-neutral-700" numberOfLines={1}>
                      {formatCurrency(subtotal)}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between py-2">
                    <Text className="text-lg font-semibold text-neutral-600">Giảm giá</Text>
                    <Text className="text-lg font-semibold text-emerald-600" numberOfLines={1}>
                      {formatCurrency(discount)}
                    </Text>
                  </View>
                  <View className="mt-2 border-t border-surface-200 pt-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xl font-bold text-neutral-900">Tổng cộng</Text>
                      <Text className="text-[30px] font-black tracking-[-0.5px] text-primary">
                        {formatCurrency(total)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="mx-auto mt-4 w-full max-w-[640px] gap-3">
                  <Button
                    label="Kiểm tra trạng thái QR với ngân hàng"
                    variant="primary"
                    disabled={!qrContent}
                    onPress={handleCheckStatusNow}
                    className="h-14 rounded-[16px]"
                    // textClassName="text-sm font-semibold text-neutral-500"
                  />
                  <Button
                    label="Xác nhận khách đã chuyển, kiểm tra sau"
                    variant="primary"
                    disabled={!qrContent}
                    onPress={handleForceComplete}
                    className="h-14 rounded-[16px]"
                    // textClassName="text-sm font-semibold text-neutral-500"
                  />
                  <Button
                    label="Hủy giao dịch"
                    variant="error"
                    disabled={!canCancel && !isError}
                    onPress={handleCancel}
                    className="h-14 rounded-[16px]"
                    // textClassName="text-base font-semibold text-error"
                  />
                </View>

                {isError && (
                  <View className="mt-4 flex-row gap-3">
                    <Button
                      label="Thử lại"
                      variant="primary"
                      disabled={!canRetry}
                      onPress={handleRetry}
                      className="h-14 flex-1 rounded-[16px]"
                      textClassName="text-base font-semibold"
                    />
                  </View>
                )}
              </View>

              <View style={{ position: 'absolute', left: -2000, top: 0 }}>
                {receiptOrder && (
                  <View collapsable={false} ref={printRef}>
                    <BitexcoReceiptTemplate order={receiptOrder} staffName={staffName} />
                  </View>
                )}
              </View>
            </>
          )}
        </ModalBase>
      )
    },
  ),
)

QrPaymentPopup.displayName = 'QrPaymentPopup'
export default QrPaymentPopup
