import { ViceService } from '@/screens/vice-service'
import { Button, ControlledInput, ModalBase, Shimmer } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { BitexcoReceiptTemplate } from '@/shared/features/order/components/bitexco-receipt-template'

import CardIcon from '@/assets/icons/Card.svg'
import { toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useActorRef, useSelector } from '@xstate/react'
import { AlertCircle, CheckCircle, Wifi } from 'lucide-react-native'
import React, { forwardRef, memo, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Text, View } from 'react-native'

import {
  exchangePortablePaymentMachine,
  getExchangePortablePaymentStatusLabel,
} from '../machines/exchange-portable-payment.machine'
import { PAYMENT_ERROR_CODES, PaymentPopupProps } from '../types'
import { calculateSubtotal, calculateTotalTax } from '../utils'
import { ManualCardDetailsFormData, manualCardDetailsSchema } from '../validation'

const STAGES = ['Khởi tạo', 'Kết nối', 'Quẹt thẻ', 'Hoàn tất']

export interface ExchangePortablePaymentPopupProps extends PaymentPopupProps {
  onCancel?: () => void
}

export interface ExchangePortablePaymentPopupRef {
  open: (overrideInput?: { paymentId: string; checkoutResult: any }) => void
  close: () => void
}

export const ExchangePortablePaymentPopup = memo(
  forwardRef<ExchangePortablePaymentPopupRef, ExchangePortablePaymentPopupProps>(
    (
      {
        total,
        discount,
        items,
        staffId,
        shiftId,
        staffName,
        appliedVoucher,
        printRef,
        onSuccess,
        onCancel,
        affiliate,
      },
      ref,
    ) => {
      const [visible, setVisible] = useState(false)
      const [showManualForm, setShowManualForm] = useState(false)

      const { control, handleSubmit, reset } = useForm<ManualCardDetailsFormData>({
        resolver: valibotResolver(manualCardDetailsSchema),
        defaultValues: {
          terminalId: '',
          merchantId: '',
          referenceNumber: '',
          approvalCode: '',
        },
      })

      const subtotal = calculateSubtotal(items)
      const tax = calculateTotalTax(items)

      const actorRef = useActorRef(exchangePortablePaymentMachine, {
        input: {
          total,
          discount,
          items,
          staffId,
          shiftId,
          sessionId: shiftId ?? 'unknown',
          appliedVoucher: appliedVoucher || null,
          printRef,
          affiliateId: affiliate?.id ?? null,
          agentType: affiliate?.agentType ?? null,
          paymentId: '',
          checkoutResult: null,
        },
      })

      const machineStateSelect = useSelector(actorRef, (s) => s.value)
      const checkoutResult = useSelector(actorRef, (s) => s.context.checkoutResult)
      const paymentId = useSelector(actorRef, (s) => s.context.paymentId)
      const error = useSelector(actorRef, (s) => s.context.error)
      const errorCode = useSelector(actorRef, (s) => s.context.errorCode)
      const statusLabel = useSelector(actorRef, getExchangePortablePaymentStatusLabel)
      const canRetry = useSelector(actorRef, (s) => s.can({ type: 'RETRY' }))
      const canCancel = useSelector(actorRef, (s) => s.can({ type: 'CANCEL' }))

      const isIdle = machineStateSelect === 'idle'
      const isProcessingPayment = machineStateSelect === 'processingPayment'
      const isConnecting = machineStateSelect === 'connecting'
      const isConnectionFailed = machineStateSelect === 'connectionFailed'
      const isSendingCommand = machineStateSelect === 'sendingCommand'
      const isVerifyingUnknown = machineStateSelect === 'verifyingUnknown'
      const isCapturingCard = machineStateSelect === 'capturingCard'
      const isAuthorizingPayment = machineStateSelect === 'authorizingPayment'
      const isCapturingPayment = machineStateSelect === 'capturingPayment'
      const isPaymentFailed = machineStateSelect === 'paymentFailed'
      const isCanceling = machineStateSelect === 'cancelingPayment'
      const isManualResolution = machineStateSelect === 'manualResolution'
      const isCapturingCardManual = machineStateSelect === 'capturingCardManual'
      const isPreparingReceipt = machineStateSelect === 'preparingReceipt'
      const isPrinting = machineStateSelect === 'printingReceipt'
      const isSuccess = machineStateSelect === 'success'

      const isFailure = isConnectionFailed || isPaymentFailed || isManualResolution
      const isFinalizing =
        isCapturingCard ||
        isCapturingCardManual ||
        isAuthorizingPayment ||
        isCapturingPayment ||
        isPreparingReceipt ||
        isPrinting
      const isLoading =
        isProcessingPayment ||
        isConnecting ||
        isSendingCommand ||
        isVerifyingUnknown ||
        isFinalizing ||
        isCanceling

      const activeStep = (() => {
        if (isProcessingPayment || isConnecting || isConnectionFailed) return 1
        if (isSendingCommand || isVerifyingUnknown || isPaymentFailed) return 2
        if (isFinalizing || isManualResolution || isSuccess) return 3
        return 0
      })()

      useEffect(() => {
        if (visible) {
          if (isSuccess) {
            ViceService.paymentSuccess({
              subtotal,
              discount,
              tax,
              total,
              customerPaid: total,
              change: 0,
            })
          } else if (isFailure) {
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
          } else {
            ViceService.showPortablePayment()
          }
        } else if (!isSuccess) {
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
      }, [visible, isSuccess, isFailure, errorCode, error, items, subtotal, discount, tax, total])

      useImperativeHandle(
        ref,
        () => ({
          open: (overrideInput?: { paymentId: string; checkoutResult: any }) => {
            setVisible(true)
            setShowManualForm(false)
            reset()

            actorRef.send({
              type: 'START',
              input: {
                total,
                discount,
                items,
                staffId,
                shiftId,
                sessionId: shiftId ?? 'unknown',
                appliedVoucher: appliedVoucher || null,
                printRef,
                affiliateId: affiliate?.id ?? null,
                agentType: affiliate?.agentType ?? null,
                paymentId: overrideInput?.paymentId ?? '',
                checkoutResult: overrideInput?.checkoutResult ?? null,
              },
            })

            setTimeout(() => {
              actorRef.send({ type: 'CONFIRM' })
            }, 300)
          },
          close: () => {
            actorRef.send({ type: 'CANCEL' })
          },
        }),
        [
          actorRef,
          affiliate,
          appliedVoucher,
          discount,
          items,
          printRef,
          reset,
          shiftId,
          staffId,
          total,
        ],
      )

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

        const timer = setTimeout(() => {
          setVisible(false)
          onSuccess({
            success: true,
            method: 'card_bidv',
            paidAmount: total,
            change: 0,
            referenceCode: checkoutResult?.orderId ?? paymentId ?? undefined,
            isOnline: true,
            orderId: checkoutResult?.orderId ?? undefined,
          })
        }, 1800)

        return () => clearTimeout(timer)
      }, [
        isSuccess,
        visible,
        subtotal,
        discount,
        tax,
        total,
        onSuccess,
        checkoutResult?.orderId,
        paymentId,
      ])

      useEffect(() => {
        if (isIdle && visible && !isLoading && checkoutResult === null) {
          const timer = setTimeout(() => {
            setVisible(false)
            onCancel?.()
          }, 500)
          return () => clearTimeout(timer)
        }
      }, [isIdle, visible, isLoading, checkoutResult, onCancel])

      const handleCancel = () => {
        toast.confirm({
          title: 'Xác nhận hủy giao dịch',
          message: 'Bạn có chắc chắn muốn hủy giao dịch thanh toán qua thẻ này không?',
          onConfirm: () => {
            actorRef.send({ type: 'CANCEL' })
            if (!checkoutResult) {
              setVisible(false)
              onCancel?.()
            }
          },
        })
      }

      const handleRetry = () => {
        actorRef.send({ type: 'RETRY' })
      }

      const handleRetryUpdate = () => {
        actorRef.send({ type: 'RETRY' })
      }

      const handleForceComplete = () => {
        toast.confirm({
          title: 'Xác nhận hoàn tất',
          message: 'Bạn đã chắc chắn khách đã thanh toán thành công trên máy POS chưa?',
          onConfirm: () => actorRef.send({ type: 'FORCE_COMPLETE' }),
        })
      }

      const handleManualCaptureSubmit = (data: ManualCardDetailsFormData) => {
        toast.confirm({
          title: 'Xác nhận thanh toán thủ công',
          message: 'Hãy chắc chắn giao dịch đã thành công trên máy EDC trước khi xác nhận.',
          onConfirm: () => {
            actorRef.send({
              type: 'MANUAL_CAPTURE',
              terminalId: data.terminalId?.trim() || undefined,
              merchantId: data.merchantId?.trim() || undefined,
              referenceNumber: data.referenceNumber?.trim() || undefined,
              approvalCode: data.approvalCode?.trim() || undefined,
            })
            setShowManualForm(false)
          },
        })
      }

      const renderStageBox = (label: string, index: number) => {
        const isActive = activeStep === index
        const isDone = activeStep > index
        const isFailed = (isConnectionFailed && index === 1) || (isPaymentFailed && index === 2)

        return (
          <View
            key={label}
            className={`flex-1 rounded-[16px] border px-3 py-4 ${
              isFailed
                ? 'border-error/30 bg-error/10'
                : isActive
                  ? 'border-primary bg-primary/10'
                  : isDone
                    ? 'border-success/30 bg-success/10'
                    : 'border-surface-200 bg-surface-100'
            }`}
          >
            <Text
              className={`text-center text-base font-bold uppercase tracking-[0.1em] ${
                isFailed
                  ? 'text-error'
                  : isActive
                    ? 'text-primary'
                    : isDone
                      ? 'text-success'
                      : 'text-neutral-500'
              }`}
              numberOfLines={2}
            >
              {label}
            </Text>
          </View>
        )
      }

      const renderMainContent = () => {
        if (showManualForm) {
          return (
            <View className="w-full px-2 py-4">
              <Text className="text-center text-[34px] font-black text-surface-on">
                Nhập thông tin thẻ thủ công
              </Text>
              <Text className="text-surface-onVariant mt-3 text-center text-xl leading-8">
                Điền thông tin từ hóa đơn máy EDC để ghi nhận thanh toán.
              </Text>

              <View className="mt-6 gap-4">
                <ControlledInput
                  control={control}
                  name="terminalId"
                  label="Mã thiết bị (TID)"
                  placeholder="Ví dụ: 01684838"
                  placeholderTextColor={COLORS.outline.default}
                  className="h-16 rounded-[16px] px-5 text-xl font-bold"
                />
                <ControlledInput
                  control={control}
                  name="merchantId"
                  label="Mã cửa hàng (MID)"
                  placeholder="Ví dụ: 000000925126645"
                  placeholderTextColor={COLORS.outline.default}
                  className="h-16 rounded-[16px] px-5 text-xl font-bold"
                />
                <ControlledInput
                  control={control}
                  name="referenceNumber"
                  label="Mã RRN / Số tham chiếu"
                  placeholder="Ví dụ: 614801081012"
                  placeholderTextColor={COLORS.outline.default}
                  keyboardType="numeric"
                  className="h-16 rounded-[16px] px-5 text-xl font-bold"
                />
                <ControlledInput
                  control={control}
                  name="approvalCode"
                  label="Mã Approval"
                  placeholder="Ví dụ: 313963"
                  placeholderTextColor={COLORS.outline.default}
                  keyboardType="numeric"
                  className="h-16 rounded-[16px] px-5 text-xl font-bold"
                />
              </View>

              <View className="mt-6 flex-row gap-4">
                <Button
                  label="Quay lại"
                  variant="outline"
                  onPress={() => setShowManualForm(false)}
                  className="h-16 flex-1 rounded-[18px]"
                  textClassName="text-xl font-bold"
                />
                <Button
                  label="Xác nhận"
                  variant="primary"
                  onPress={handleSubmit(handleManualCaptureSubmit)}
                  className="h-16 flex-1 rounded-[18px]"
                  textClassName="text-xl font-bold"
                />
              </View>
            </View>
          )
        }

        if (isSuccess) {
          return (
            <View className="items-center justify-center px-4 py-8">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-success/10">
                <CheckCircle size={52} color="#22c55e" />
              </View>
              <Text className="mt-5 text-center text-[34px] font-black text-success">
                Đã nhận tiền
              </Text>
              <Text className="mt-3 max-w-[520px] text-center text-xl leading-8 text-neutral-600">
                Đang hoàn tất hóa đơn và in biên lai.
              </Text>
            </View>
          )
        }

        if (isFailure) {
          return (
            <View className="items-center justify-center px-4 py-8">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-error/10">
                <AlertCircle size={52} color={COLORS.error.default} />
              </View>
              <Text className="mt-5 text-center text-[34px] font-bold text-error" numberOfLines={1}>
                Giao dịch chưa hoàn tất
              </Text>
              <Text className="mt-3 max-w-[520px] text-center text-xl leading-8 text-neutral-600">
                Vui lòng thử lại hoặc xác nhận thủ công nếu khách đã thanh toán thành công.
              </Text>
            </View>
          )
        }

        return (
          <View className="items-center justify-center px-4 py-8">
            <View className="flex h-[180px] w-[180px] items-center justify-center overflow-hidden rounded-[28px] border border-surface-200 bg-surface-100 shadow-sm">
              {isConnecting || isProcessingPayment ? (
                <View className="h-[124px] w-[124px] items-center justify-center rounded-[22px] bg-primary">
                  <Wifi size={82} color={COLORS.primary.default} />
                </View>
              ) : isLoading ? (
                <Shimmer className="h-[124px] w-[124px] rounded-[22px]" />
              ) : (
                <CardIcon width={80} height={80} />
              )}
            </View>
            <Text className="mt-6 text-center text-[32px] font-bold text-neutral-800">
              {statusLabel}
            </Text>
            <Text className="mt-3 max-w-[520px] text-center text-xl leading-8 text-neutral-600">
              {isSendingCommand
                ? 'Khách vui lòng chạm, quẹt hoặc cắm thẻ trên máy EDC.'
                : isVerifyingUnknown
                  ? 'Đang kiểm tra lại trạng thái giao dịch.'
                  : 'Vui lòng chờ trong giây lát.'}
            </Text>
          </View>
        )
      }

      return (
        <ModalBase
          visible={visible}
          onClose={handleCancel}
          dismissible={!isLoading && !isManualResolution}
          className="max-w-[840px] overflow-hidden rounded-[28px] bg-surface-50"
        >
          {visible && (
            <>
              <View className="bg-surface-50 px-5 pb-5 pt-5">
                <View className="overflow-hidden rounded-[32px] border border-surface-200 bg-white px-8 py-7 shadow-sm">
                  <View className="items-center">{renderMainContent()}</View>
                </View>

                {!showManualForm && (
                  <>
                    <View className="mx-auto mt-4 w-full max-w-[700px] flex-row gap-3">
                      {STAGES.map(renderStageBox)}
                    </View>

                    <View className="mx-auto mt-4 w-full max-w-[700px] rounded-[24px] border border-surface-200 bg-white px-6 py-5 shadow-sm">
                      <View className="flex-row items-center justify-between py-2">
                        <Text className="text-[26px] font-semibold text-neutral-600">Tạm tính</Text>
                        <Text
                          className="text-[26px] font-semibold text-neutral-700"
                          numberOfLines={1}
                        >
                          {formatCurrency(subtotal)}
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between py-2">
                        <Text className="text-[26px] font-semibold text-neutral-600">Giảm giá</Text>
                        <Text
                          className="text-[26px] font-semibold text-emerald-600"
                          numberOfLines={1}
                        >
                          {formatCurrency(discount)}
                        </Text>
                      </View>
                      <View className="mt-2 border-t border-surface-200 pt-4">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-[30px] font-bold text-neutral-900">Tổng cộng</Text>
                          <Text className="text-[44px] font-black tracking-[-0.5px] text-primary">
                            {formatCurrency(total)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="mx-auto mt-4 w-full max-w-[700px] gap-3">
                      {(isConnectionFailed || isPaymentFailed) && (
                        <Button
                          label={isConnectionFailed ? 'Thử kết nối lại' : 'Quẹt lại thẻ'}
                          variant="primary"
                          disabled={!canRetry}
                          onPress={handleRetry}
                          className="h-16 rounded-[18px]"
                        />
                      )}
                      {(isConnectionFailed || isPaymentFailed) && (
                        <Button
                          label="Xác nhận thủ công"
                          variant="primary"
                          onPress={() => setShowManualForm(true)}
                          className="h-16 rounded-[18px]"
                        />
                      )}
                      {isManualResolution && (
                        <>
                          <Button
                            label="Xác nhận tay"
                            variant="primary"
                            onPress={handleForceComplete}
                            className="h-16 rounded-[18px]"
                            textClassName="text-[26px] font-semibold"
                          />
                          <Button
                            label="Thử lại ghi nhận giao dịch"
                            variant="outline"
                            onPress={handleRetryUpdate}
                            className="h-16 rounded-[18px] border-surface-200 bg-white"
                            textClassName="text-[26px] font-semibold text-neutral-500"
                          />
                        </>
                      )}
                      <Button
                        label={isManualResolution ? 'Đóng sự cố' : 'Hủy giao dịch'}
                        variant="outline"
                        disabled={
                          !canCancel &&
                          !isConnectionFailed &&
                          !isPaymentFailed &&
                          !isManualResolution
                        }
                        onPress={handleCancel}
                        className="h-16 rounded-[18px] border-error/30 bg-error/5"
                        textClassName="text-[26px] font-semibold text-error"
                      />
                    </View>
                  </>
                )}
              </View>

              <View style={{ position: 'absolute', left: -2000, top: 0 }}>
                {checkoutResult && (
                  <View collapsable={false} ref={printRef}>
                    <BitexcoReceiptTemplate
                      order={
                        {
                          id: checkoutResult.orderId,
                          total: checkoutResult.grandTotal,
                          subtotal,
                          discount,
                          totalTax: checkoutResult.taxTotal,
                          itemsSnapshot: items.map((i) => ({
                            sku: i.product.sku,
                            name: i.product.name,
                            price: i.product.price,
                            quantity: i.quantity,
                            subtotal: i.product.price * i.quantity,
                            taxRate: i.product.taxRate || 0,
                            taxAmount:
                              i.product.price * i.quantity * ((i.product.taxRate || 0) / 100),
                          })),
                          paymentsSnapshot: [
                            {
                              method: 'card_bidv',
                              amount: checkoutResult.grandTotal,
                            },
                          ],
                        } as any
                      }
                      staffName={staffName}
                    />
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

ExchangePortablePaymentPopup.displayName = 'ExchangePortablePaymentPopup'
export default ExchangePortablePaymentPopup
