import MixIcon from '@/assets/icons/Mix.svg'
import { ViceService } from '@/screens/vice-service'
import { Button, ControlledInput, ModalBase, Numpad, Shimmer } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAppContext } from '@/shared/features/app/hooks/use-app-context'
import { BitexcoReceiptTemplate } from '@/shared/features/order/components/bitexco-receipt-template'
import { IOrder } from '@/shared/features/order/types'
import { OrderStatus } from '@/shared/lib/database'
import { toast, useConnectionStore } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { valibotResolver } from '@hookform/resolvers/valibot'
import NetInfo from '@react-native-community/netinfo'
import { useActorRef, useSelector } from '@xstate/react'
import { AlertCircle, CheckCircle, Clock3, CreditCard, QrCode } from 'lucide-react-native'
import React, { forwardRef, memo, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import * as v from 'valibot'

import type { AppliedVoucher } from '@/shared/features/pos'
import { mixPaymentMachine } from '../machines/mix-payment.machine'
import { PAYMENT_ERROR_CODES, PaymentPopupProps, PaymentPopupRef } from '../types'
import { calculateLineDiscount, calculateSubtotal, calculateTotalTax, getMixPaymentSuggestions } from '../utils'
import {
  ManualCardDetailsFormData,
  manualCardDetailsSchema,
} from '../validation/manual-card.validation'

/**
 * Xây dựng IOrder đầy đủ cho in hóa đơn thanh toán hỗn hợp.
 */
function buildReceiptOrder(
  checkoutResult: any,
  items: any[],
  cashAmount: number,
  nonCashAmount: number,
  selectedMethod: 'qr' | 'card' | null,
  total: number,
  subtotal: number,
  discount: number,
  staffId: string,
  shiftId: string,
  appliedVoucher: AppliedVoucher | null | undefined,
): IOrder {
  const orderId = checkoutResult?.orderCode || checkoutResult?.orderId || 'unknown'
  const totalTax = calculateTotalTax(items, appliedVoucher)

  return {
    id: orderId,
    shiftId,
    staffId,
    status: OrderStatus.COMPLETED,
    subtotal,
    discount,
    voucherDiscount: discount,
    total,
    totalTax,
    customerTaxInfo: null,
    isDeleted: false,
    canReturn: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    itemsSnapshot: items.map((i) => {
      const lineDiscount = calculateLineDiscount(i, items, appliedVoucher)
      const netAmount = Math.max(0, i.price * i.quantity - lineDiscount)
      const taxRate = i.product?.taxRate ?? 0
      return {
        productId: i.product?.id,
        sku: i.product?.sku,
        name: i.product?.name,
        price: i.price,
        quantity: i.quantity,
        subtotal: i.price * i.quantity,
        taxRate,
        taxAmount: taxRate > 0 ? Math.round(netAmount * (taxRate / (100 + taxRate))) : 0,
        discountAmount: lineDiscount,
      }
    }),
    paymentsSnapshot: [
      {
        method: 'cash',
        amount: cashAmount,
      },
      {
        method: selectedMethod === 'qr' ? 'qr_bidv' : 'card_bidv',
        amount: nonCashAmount,
      },
    ],
  }
}

const managerApprovalSchema = v.object({
  employeeCode: v.pipe(v.string(), v.minLength(1, 'Mã quản lý là bắt buộc')),
  pin: v.pipe(v.string(), v.minLength(1, 'PIN là bắt buộc')),
})

type ManagerApprovalFormData = v.InferOutput<typeof managerApprovalSchema>

export const MixPaymentPopup = memo(
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
        note,
        affiliate,
      },
      ref,
    ) => {
      const [visible, setVisible] = useState(false)
      const [cashInput, setCashInput] = useState('')
      const [showManualForm, setShowManualForm] = useState(false)
      const [timeLeftSecs, setTimeLeftSecs] = useState<number | null>(null)

      const timeLeft = React.useMemo(() => {
        if (timeLeftSecs === null) return '--:--'
        const mins = Math.floor(timeLeftSecs / 60)
        const secs = timeLeftSecs % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }, [timeLeftSecs])
      const { tenantConfig, paymentMethods } = useAppContext()
      const isNetworkConnected = useConnectionStore((s) => s.isNetworkConnected)
      const isPosConnected = useConnectionStore((s) => s.isPosConnected)

      const qrLabel = React.useMemo(() => {
        const method = paymentMethods?.find((m) => m.code === 'qr_bidv')
        return method?.enabled ? method.name : 'QRCode'
      }, [paymentMethods])

      const cardLabel = React.useMemo(() => {
        const method = paymentMethods?.find((m) => m.code === 'card_bidv')
        return method?.enabled ? method.name : 'Thẻ (POS)'
      }, [paymentMethods])

      const subtotal = calculateSubtotal(items)
      const tax = calculateTotalTax(items, appliedVoucher)

      const actorRef = useActorRef(mixPaymentMachine, {
        input: {
          total,
          discount,
          items,
          staffId,
          shiftId,
          sessionId: shiftId ?? 'unknown',
          appliedVoucher: appliedVoucher || null,
          printRef,
          tenantConfig,
          note,
          affiliateId: affiliate?.id ?? null,
        },
      })

      const machineState = useSelector(actorRef, (s) => s.value)
      const context = useSelector(actorRef, (s) => s.context)

      const {
        cashAmount,
        nonCashAmount,
        selectedMethod,
        error,
        errorCode,
        retryCount,
        rawCommandResult,
        checkoutResult,
        qrContent,
        expiresAt,
        createdAt,
        managerAuthError,
      } = context

      const isIdle = machineState === 'idle'
      const isCreatingCheckout = machineState === 'creatingCheckout'
      const isFetchingQr = machineState === 'fetchingQr'
      const isWaitingQr = typeof machineState === 'object' && 'waitingQrPayment' in machineState
      const isProcessingCard = machineState === 'processingCardPayment'
      const isConnectingCard = machineState === 'connectingCardTerminal'
      const isConnectionFailed = machineState === 'connectionFailed'
      const isSendingCardCmd = machineState === 'sendingCardCommand'
      const isVerifyingCard = machineState === 'verifyingUnknownCardTransaction'
      const isCapturingCardInfo = machineState === 'capturingCardInfo'
      const isCapturingCardManual = machineState === 'capturingCardManual'
      const isAuthorizingCard = machineState === 'authorizingCardPayment'
      const isCapturingCardPayment = machineState === 'capturingCardPayment'
      const isManualResolution = machineState === 'manualResolution'
      const isPaymentFailed = machineState === 'paymentFailed'
      const isError = machineState === 'error'
      const isPreparingReceipt = machineState === 'preparingReceipt'
      const isPrinting = machineState === 'printingReceipt'
      const isSuccess = machineState === 'success'
      const isCancelled = machineState === 'cancelled'
      const isWaitingManagerApproval = machineState === 'waitingManagerApproval'

      const isProcessing =
        isCreatingCheckout ||
        isFetchingQr ||
        isWaitingQr ||
        isProcessingCard ||
        isConnectingCard ||
        isSendingCardCmd ||
        isVerifyingCard ||
        isCapturingCardInfo ||
        isCapturingCardManual ||
        isAuthorizingCard ||
        isCapturingCardPayment ||
        isPreparingReceipt ||
        isPrinting

      // Quick cash suggestions smaller than the total amount
      const suggestions = getMixPaymentSuggestions(total)

      // Sync state actions
      const canConfirm = useSelector(actorRef, (s) => s.can({ type: 'CONFIRM' }))
      const canRetry = useSelector(actorRef, (s) => s.can({ type: 'RETRY' }))
      const canCancel = useSelector(actorRef, (s) => s.can({ type: 'CANCEL' }))

      // Form for manual card details capture
      const { control, handleSubmit, reset } = useForm<ManualCardDetailsFormData>({
        resolver: valibotResolver(manualCardDetailsSchema),
        defaultValues: {
          terminalId: '',
          merchantId: '',
          referenceNumber: '',
          approvalCode: '',
        },
      })

      // Form for manager PIN override approval
      const {
        control: managerControl,
        handleSubmit: handleManagerSubmit,
        reset: resetManagerForm,
        setError: setManagerError,
      } = useForm<ManagerApprovalFormData>({
        resolver: valibotResolver(managerApprovalSchema),
        defaultValues: {
          employeeCode: '',
          pin: '',
        },
      })

      useEffect(() => {
        if (!visible) {
          reset()
          resetManagerForm()
        }
      }, [visible, reset, resetManagerForm])

      useEffect(() => {
        if (managerAuthError) {
          setManagerError('pin', { type: 'manual', message: managerAuthError })
        }
      }, [managerAuthError, setManagerError])

      const onManagerSubmit = (data: ManagerApprovalFormData) => {
        actorRef.send({
          type: 'SUBMIT_MANAGER_PIN',
          managerAuth: {
            employeeCode: data.employeeCode,
            pin: data.pin,
          },
        })
      }

      const onManagerCancel = () => {
        resetManagerForm()
        actorRef.send({ type: 'CANCEL' })
      }

      useEffect(() => {
        if (!visible || !qrContent || !expiresAt || !createdAt) {
          setTimeLeftSecs(null)
          return
        }

        const expiryTime = new Date(expiresAt).getTime()
        const startTime = new Date(createdAt).getTime()
        const initialDurationSecs = Math.max(0, Math.floor((expiryTime - startTime) / 1000))

        setTimeLeftSecs(initialDurationSecs)

        const interval = setInterval(() => {
          setTimeLeftSecs((prev) => {
            if (prev === null) return null
            if (prev <= 1) {
              clearInterval(interval)
              return 0
            }
            return prev - 1
          })
        }, 1000)

        return () => clearInterval(interval)
      }, [visible, qrContent, expiresAt, createdAt])

      // Debounce updating input state in machine
      useEffect(() => {
        if (!visible) return
        const timer = setTimeout(() => {
          const val = Number(cashInput) || 0
          actorRef.send({ type: 'SET_CASH_AMOUNT', amount: val })
        }, 200)
        return () => clearTimeout(timer)
      }, [cashInput, visible, actorRef])

      // Update vice display during selection, QR, and Card payment steps
      useEffect(() => {
        if (!visible) return

        const isCardProcessing =
          isProcessingCard ||
          isConnectingCard ||
          isSendingCardCmd ||
          isVerifyingCard ||
          isCapturingCardInfo ||
          isCapturingCardManual ||
          isAuthorizingCard ||
          isCapturingCardPayment ||
          isManualResolution ||
          isPaymentFailed

        if (isPaymentFailed || isError) {
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
        } else if (isIdle || isCreatingCheckout) {
          ViceService.showMixPayment({
            subtotal,
            discount,
            tax,
            total,
            cashPaid: cashAmount,
            nonCashAmount,
          })
        } else if ((isFetchingQr || isWaitingQr) && qrContent) {
          ViceService.showPayment({
            qrCodeUrl: qrContent,
            subtotal,
            discount,
            tax,
            total: nonCashAmount,
          })
        } else if (selectedMethod === 'card' && isCardProcessing && !isSuccess) {
          ViceService.showPortablePayment({ total: nonCashAmount })
        }
      }, [
        visible,
        isIdle,
        isCreatingCheckout,
        isFetchingQr,
        isWaitingQr,
        qrContent,
        selectedMethod,
        isSuccess,
        isProcessingCard,
        isConnectingCard,
        isSendingCardCmd,
        isVerifyingCard,
        isCapturingCardInfo,
        isCapturingCardManual,
        isAuthorizingCard,
        isCapturingCardPayment,
        isManualResolution,
        isPaymentFailed,
        isError,
        errorCode,
        error,
        subtotal,
        discount,
        tax,
        total,
        cashAmount,
        nonCashAmount,
      ])

      // Clean up auxiliary screen on cancel
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

      // Handle Payment Success
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
        const resolvedOrderId = snap.context.orderId || snap.context.sessionId
        const resolvedBillCode = snap.context.orderCode || resolvedOrderId
        const isOnline = snap.context.paymentResult?.isOnline ?? true

        const timer = setTimeout(() => {
          setVisible(false)
          onSuccess({
            success: true,
            method: 'mix',
            paidAmount: total,
            change: 0,
            referenceCode: resolvedBillCode,
            isOnline,
            orderId: resolvedOrderId,
          })
        }, 1500)

        return () => clearTimeout(timer)
      }, [isSuccess, visible, total, subtotal, discount, tax, onSuccess, actorRef])

      useEffect(() => {
        if (isCancelled) {
          const hasCreatedCheckout = !!checkoutResult
          if (!hasCreatedCheckout || cashAmount <= 0) {
            // toast.info('Đã hủy giao dịch!', 'Thông báo')
          }
          const timer = setTimeout(() => setVisible(false), 800)
          return () => clearTimeout(timer)
        }
      }, [isCancelled, cashAmount, checkoutResult])



      useImperativeHandle(
        ref,
        () => ({
          open: async () => {
            const netState = await NetInfo.fetch()
            if (!netState.isConnected) {
              toast.error('Thanh toán kết hợp yêu cầu kết nối mạng!')
              return
            }

            setCashInput('')
            setVisible(true)
            setShowManualForm(false)

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
                tenantConfig,
                note,
              },
            })
          },
          close: () => {
            setVisible(false)
            actorRef.send({ type: 'CANCEL' })
          },
        }),
        [
          actorRef,
          appliedVoucher,
          printRef,
          shiftId,
          staffId,
          tenantConfig,
          discount,
          items,
          total,
          note,
        ],
      )

      const handleNumpadPress = (digit: string) => {
        if (cashInput.length < 12) {
          setCashInput((prev) => prev + digit)
        }
      }

      const handleNumpadBackspace = () => setCashInput((prev) => prev.slice(0, -1))
      const handleNumpadClear = () => setCashInput('')

      const handleClose = () => {
        const snap = actorRef.getSnapshot()
        const hasCreatedCheckout = !!snap.context.checkoutResult
        const cashAmount = snap.context.cashAmount

        if (hasCreatedCheckout && cashAmount > 0) {
          toast.confirm({
            title: 'Hoàn tiền mặt & Hủy đơn hàng',
            message: `Đã thu ${formatCurrency(cashAmount)} tiền mặt. Vui lòng hoàn lại tiền mặt cho khách trước, sau đó xác nhận hủy đơn hàng.`,
            onConfirm: () => {
              actorRef.send({ type: 'CANCEL' })
              toast.infoPopup({
                title: 'Hủy đơn hàng thành công',
                message: `Đã hủy đơn hàng thành công. Vui lòng trả lại ${formatCurrency(cashAmount)} tiền mặt cho khách.`,
              })
            },
          })
        } else {
          toast.confirm({
            title: 'Xác nhận hủy giao dịch',
            message: 'Bạn có chắc chắn muốn hủy giao dịch thanh toán hỗn hợp này không?',
            onConfirm: () => {
              actorRef.send({ type: 'CANCEL' })
            },
          })
        }
      }

      const handleConfirm = () => {
        actorRef.send({ type: 'CONFIRM' })
      }

      const handleRetry = () => {
        actorRef.send({ type: 'RETRY' })
      }

      const handleForceComplete = () => {
        toast.confirm({
          title: 'Xác nhận thanh toán thủ công',
          message:
            'Bạn có chắc chắn muốn xác nhận khách đã thanh toán thành công phần tiền không dùng tiền mặt và ghi nhận đơn hàng này không?',
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
              terminalId: data.terminalId || undefined,
              merchantId: data.merchantId || undefined,
              referenceNumber: data.referenceNumber || undefined,
              approvalCode: data.approvalCode || undefined,
            })
            setShowManualForm(false)
          },
        })
      }

      const isQrUrl = qrContent ? qrContent.startsWith('http') : false

      const STAGES = ['Khởi tạo', 'Kết nối', 'Quẹt thẻ', 'Hoàn tất']
      const activeStep = (() => {
        if (isProcessingCard || isConnectingCard || isConnectionFailed) return 1
        if (isSendingCardCmd || isVerifyingCard || isPaymentFailed) return 2
        if (
          isCapturingCardInfo ||
          isCapturingCardManual ||
          isAuthorizingCard ||
          isCapturingCardPayment ||
          isManualResolution ||
          isSuccess
        ) {
          return 3
        }
        return 0
      })()

      const renderStageBox = (label: string, index: number) => {
        const isDone = index < activeStep
        const isActive = index === activeStep
        const isFailed = (isConnectionFailed && index === 1) || (isPaymentFailed && index === 2)

        return (
          <View
            key={label}
            className={`flex-1 rounded-[12px] border p-2 ${
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
              className={`text-center text-xs font-bold uppercase tracking-[0.05em] ${
                isFailed
                  ? 'text-error'
                  : isActive
                    ? 'text-primary'
                    : isDone
                      ? 'text-success'
                      : 'text-neutral-500'
              }`}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        )
      }

      const renderRightPanel = () => {
        if (isSuccess) {
          return (
            <View className="flex-1 items-center justify-center px-4 py-8">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-success/10">
                <CheckCircle size={52} color="#00944a" />
              </View>
              <Text className="mt-5 text-center text-2xl font-bold text-success">
                Đã hoàn thành
              </Text>
              <Text className="mt-2 max-w-[280px] text-center text-sm leading-6 text-neutral-600">
                Thanh toán thành công. Đang chuẩn bị và in hóa đơn.
              </Text>
            </View>
          )
        }

        if (showManualForm) {
          return (
            <View className="flex-1 justify-between">
              <View className="gap-4">
                <Text className="text-xl font-bold text-surface-on">
                  Nhập thông tin thẻ thủ công
                </Text>

                <View className="mt-4 gap-4">
                  <ControlledInput
                    control={control}
                    name="terminalId"
                    label="Mã thiết bị (TID)"
                    placeholder="Ví dụ: 01684838"
                    placeholderTextColor={COLORS.outline.default}
                    className="h-14 rounded-[12px] px-4 text-lg font-bold"
                  />
                  <ControlledInput
                    control={control}
                    name="merchantId"
                    label="Mã cửa hàng (MID)"
                    placeholder="Ví dụ: 000000925126645"
                    placeholderTextColor={COLORS.outline.default}
                    className="h-14 rounded-[12px] px-4 text-lg font-bold"
                  />
                  <ControlledInput
                    control={control}
                    name="referenceNumber"
                    label="Mã RRN / Số tham chiếu"
                    placeholder="Ví dụ: 614801081012"
                    placeholderTextColor={COLORS.outline.default}
                    keyboardType="numeric"
                    className="h-14 rounded-[12px] px-4 text-lg font-bold"
                  />
                  <ControlledInput
                    control={control}
                    name="approvalCode"
                    label="Mã Approval"
                    placeholder="Ví dụ: 313963"
                    placeholderTextColor={COLORS.outline.default}
                    keyboardType="numeric"
                    className="h-14 rounded-[12px] px-4 text-lg font-bold"
                  />
                </View>
              </View>

              <View className="mt-6 flex-row gap-4">
                <Button
                  label="Quay lại"
                  variant="outline"
                  onPress={() => setShowManualForm(false)}
                  className="h-16 flex-1 rounded-[16px]"
                />
                <Button
                  label="Xác nhận"
                  variant="primary"
                  onPress={handleSubmit(handleManualCaptureSubmit)}
                  className="h-16 flex-1 rounded-[16px]"
                />
              </View>
            </View>
          )
        }

        if (selectedMethod === 'qr' && (isPaymentFailed || isError)) {
          return (
            <View className="items-center justify-center px-4 py-8">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-error/10">
                <AlertCircle size={52} color="#dd2027" />
              </View>
              <Text className="mt-5 text-center text-2xl font-bold text-error">
                Thanh toán thất bại
              </Text>
              <Text className="mt-2 max-w-[300px] text-center text-sm leading-6 text-neutral-600">
                {error || 'Đã có lỗi xảy ra trong quá trình xử lý.'}
              </Text>
              <View className="mt-8 w-full gap-3">
                <Button
                  label="Thử lại"
                  variant="primary"
                  disabled={!canRetry || isProcessing}
                  onPress={handleRetry}
                  className="h-16"
                />
                <Button
                  label="Xác nhận khách đã chuyển"
                  variant="outline"
                  onPress={handleForceComplete}
                  className="h-16"
                />
                <Button
                  label="Hủy giao dịch"
                  variant="error"
                  disabled={isProcessing}
                  onPress={handleClose}
                  className="h-16"
                />
              </View>
            </View>
          )
        }

        if (isIdle) {
          return (
            <>
              <View>
                <Numpad
                  onPress={handleNumpadPress}
                  onBackspace={handleNumpadBackspace}
                  onClear={handleNumpadClear}
                />
              </View>

              {/* Action Buttons */}
              <View className="mt-8 gap-3">
                {isError && (
                  <Button
                    label="Thử lại"
                    variant="primary"
                    disabled={!canRetry || isProcessing}
                    onPress={handleRetry}
                    className="h-20"
                  />
                )}
                {!isError && (
                  <Button
                    label="Tiến hành Thanh toán"
                    variant="primary"
                    disabled={!canConfirm || isProcessing}
                    onPress={handleConfirm}
                    className="h-20"
                    loading={isProcessing}
                  />
                )}
                <Button
                  label="Hủy giao dịch"
                  variant="error"
                  disabled={isProcessing}
                  onPress={handleClose}
                  className="h-16"
                />
              </View>
            </>
          )
        }

        // Loading/Progress screens
        return (
          <>
            <View className="w-full flex-1 items-center justify-center">
              {selectedMethod === 'qr' ? (
                <View className="w-full items-center">
                  {isError || isPaymentFailed ? (
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
                  ) : qrContent ? (
                    <View className="items-center justify-center px-4 py-6">
                      <View className="rounded-[22px] border border-surface-200 bg-white p-4">
                        {isQrUrl ? (
                          <Image
                            source={{ uri: qrContent }}
                            style={{ width: 240, height: 240 }}
                            resizeMode="contain"
                          />
                        ) : (
                          <QRCode
                            value={qrContent}
                            size={240}
                            color="black"
                            backgroundColor="white"
                          />
                        )}
                      </View>
                      <View className="mt-3 flex-row items-center gap-2 rounded-full border border-orange-300 bg-white px-4 py-2">
                        <Clock3 size={18} color="#fb8c00" />
                        <Text className="text-xl font-black tracking-[1px] text-[#fb8c00]">
                          {timeLeft}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View className="items-center justify-center px-4 py-6">
                      <View className="flex h-[220px] w-[220px] items-center justify-center overflow-hidden rounded-[22px] border border-surface-200 bg-surface-100 shadow-sm">
                        {isCreatingCheckout || isFetchingQr ? (
                          <Shimmer className="h-[160px] w-[160px] rounded-[18px]" />
                        ) : (
                          <View className="h-[160px] w-[160px] items-center justify-center rounded-[18px] bg-white">
                            <QrCode size={72} color={COLORS.surface.onVariant} />
                          </View>
                        )}
                      </View>
                      <View className="mt-3 flex-row items-center gap-2 rounded-full border border-orange-300 bg-white px-4 py-2">
                        <Clock3 size={18} color="#fb8c00" />
                        <Text className="text-xl font-black tracking-[1px] text-[#fb8c00]">
                          {timeLeft}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View className="w-full items-center gap-4">
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <CreditCard size={48} color={COLORS.primary.default} />
                  </View>
                  <Text
                    className="max-w-[280px] text-center text-2xl text-neutral-500"
                    numberOfLines={1}
                  >
                    Số tiền quẹt thẻ: {formatCurrency(nonCashAmount)}
                  </Text>
                  <View className="mt-4 w-full flex-row gap-2">{STAGES.map(renderStageBox)}</View>
                  {error && (
                    <Text className="mt-2 max-w-[280px] text-center text-xl text-error">
                      Lỗi: {error}
                    </Text>
                  )}
                  {!isConnectionFailed && !isPaymentFailed && !isManualResolution && (
                    <Shimmer className="mt-4 h-4 w-48 rounded" />
                  )}
                </View>
              )}
            </View>

            <View className="mt-6 w-full gap-3">
              {selectedMethod === 'qr' && (
                <>
                  {qrContent && (
                    <Button
                      label="Xác nhận khách đã chuyển"
                      variant="outline"
                      onPress={handleForceComplete}
                      className="h-16 w-full"
                    />
                  )}
                  {(isPaymentFailed || isError) && (
                    <Button
                      label="Thử lại"
                      variant="primary"
                      disabled={!canRetry}
                      onPress={handleRetry}
                      className="h-16 w-full"
                    />
                  )}
                </>
              )}

              {selectedMethod === 'card' && (isConnectionFailed || isPaymentFailed) && (
                <>
                  <Button
                    label={isConnectionFailed ? 'Thử kết nối lại' : 'Thử quẹt thẻ lại'}
                    variant="primary"
                    disabled={!canRetry}
                    onPress={handleRetry}
                    className="h-16 w-full"
                  />
                  <Button
                    label="Xác nhận thủ công"
                    variant="outline"
                    onPress={() => setShowManualForm(true)}
                    className="h-16 w-full"
                  />
                </>
              )}

              {selectedMethod === 'card' && isManualResolution && (
                <>
                  <Button
                    label="Xác nhận tay"
                    variant="primary"
                    onPress={handleForceComplete}
                    className="h-16 w-full"
                  />
                  <Button
                    label="Thử lại ghi nhận giao dịch"
                    variant="outline"
                    onPress={handleRetry}
                    className="h-16 w-full"
                  />
                </>
              )}

              <Button
                label={isManualResolution ? 'Đóng sự cố' : 'Hủy giao dịch'}
                variant="error"
                disabled={!canCancel}
                onPress={handleClose}
                className={`h-16 w-full ${isManualResolution ? 'border-error/30 bg-error/5' : ''}`}
                textClassName={isManualResolution ? 'text-error' : undefined}
              />
            </View>
          </>
        )
      }

      const receiptOrder = checkoutResult
        ? buildReceiptOrder(
            checkoutResult,
            items,
            cashAmount,
            nonCashAmount,
            selectedMethod,
            total,
            subtotal,
            discount,
            staffId,
            shiftId,
            appliedVoucher,
          )
        : null

      return (
        <ModalBase
          visible={visible}
          onClose={handleClose}
          dismissible={!isProcessing && !isManualResolution && !isWaitingManagerApproval}
          className="max-w-[1100px] flex-row"
        >
          {visible && (
            <>
              {/* Left Side: Split Details */}
              <View className="flex-1 justify-between border-r border-outline-variant bg-background p-10">
                <View>
                  <View className="mb-8 flex-row items-center gap-4">
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
                      <MixIcon width={32} height={32} />
                    </View>
                    <Text className="text-4xl font-bold text-surface-on">Thanh toán hỗn hợp</Text>
                  </View>

                  <View className="gap-4">
                    {/* Cash Portion */}
                    <View className="rounded-xl border-2 border-primary bg-primary/5 p-6">
                      <Text className="mb-1 text-xl font-bold text-primary">
                        Tiền mặt thanh toán
                      </Text>
                      <Text className="text-5xl font-bold text-surface-on">
                        {cashInput ? formatCurrency(Number(cashInput)) : '0 đ'}
                      </Text>
                    </View>

                    {/* Non-cash Remaining Amount */}
                    <View className="rounded-xl border border-outline-variant bg-white p-6">
                      <Text className="text-surface-onVariant mb-1 text-xl font-bold">
                        Số tiền còn lại (QR / Thẻ)
                      </Text>
                      <Text className="text-5xl font-bold text-neutral-800">
                        {formatCurrency(nonCashAmount)}
                      </Text>
                    </View>

                    {/* Total Order Amount */}
                    <View className="rounded-xl border border-outline-variant bg-surface-50 p-6">
                      <Text className="text-surface-onVariant mb-1 text-xl font-medium">
                        Tổng tiền hóa đơn
                      </Text>
                      <Text className="text-5xl font-bold text-primary">
                        {formatCurrency(total)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Suggestions & Method Selection */}
                <View className="mt-8 gap-6">
                  <View>
                    <Text className="text-surface-onVariant mb-4 text-lg font-bold uppercase tracking-wider">
                      Gợi ý nhanh tiền mặt
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="w-full"
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {suggestions.map((amt, idx) => (
                        <Button
                          key={`suggestion-${idx}-${amt}`}
                          label={formatCurrency(amt)}
                          variant="outline"
                          className="h-18 min-w-[140px]"
                          disabled={!isIdle}
                          onPress={() => setCashInput(amt.toString())}
                        />
                      ))}
                    </ScrollView>
                  </View>

                  <View>
                    <Text className="text-surface-onVariant mb-4 text-lg font-bold uppercase tracking-wider">
                      Chọn phương thức thanh toán còn lại
                    </Text>
                    <View className="flex-row gap-4">
                      <View className="flex-1">
                        <Button
                          label={qrLabel}
                          leftIcon={QrCode}
                          iconSize={32}
                          variant={selectedMethod === 'qr' ? 'primary' : 'outline'}
                          className="h-[84px] w-full border-2"
                          disabled={!isIdle}
                          onPress={() => actorRef.send({ type: 'SELECT_METHOD', method: 'qr' })}
                        />
                      </View>

                      <View className="flex-1">
                        <Button
                          label={cardLabel}
                          leftIcon={CreditCard}
                          iconSize={32}
                          variant={selectedMethod === 'card' ? 'primary' : 'outline'}
                          className="h-[84px] w-full border-2"
                          disabled={!isIdle}
                          onPress={() => actorRef.send({ type: 'SELECT_METHOD', method: 'card' })}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Right Side: Flow Steps or Payment Screen */}
              <View className="w-[480px] justify-between bg-surface-50 p-10">
                {renderRightPanel()}
              </View>

              {/* Hidden Print Template */}
              <View style={{ position: 'absolute', left: -2000, top: 0 }}>
                {receiptOrder && (
                  <View collapsable={false} ref={printRef}>
                    <BitexcoReceiptTemplate order={receiptOrder} staffName={staffName} />
                  </View>
                )}
              </View>

              {/* Manager Approval Overlay */}
              {(isWaitingManagerApproval ||
                (machineState === 'cancelling' && context.managerAuth !== null)) && (
                <View style={styles.managerOverlay}>
                  <View style={styles.managerCard}>
                    <View style={styles.managerCardHeader}>
                      <Text style={styles.managerCardTitle}>Yêu cầu Quyền Quản lý</Text>
                      <Text style={styles.managerCardSubtitle}>
                        Vui lòng nhập tài khoản và mã PIN của quản lý để phê duyệt hủy đơn hàng.
                      </Text>
                    </View>

                    <View style={styles.managerFormGroup}>
                      <ControlledInput
                        control={managerControl}
                        name="employeeCode"
                        label="Tài khoản Quản lý"
                        placeholder="Nhập mã nhân viên quản lý"
                      />
                      <ControlledInput
                        control={managerControl}
                        name="pin"
                        label="Mã PIN"
                        placeholder="Nhập mã PIN/Mật khẩu"
                        secureTextEntry
                      />
                    </View>

                    <View className="mt-2 flex-row gap-4">
                      <Button
                        label="Hủy bỏ"
                        variant="outline"
                        onPress={onManagerCancel}
                        className="h-14 flex-1"
                        textClassName="font-bold"
                        disabled={machineState === 'cancelling'}
                      />
                      <Button
                        label="Xác nhận"
                        variant="primary"
                        onPress={handleManagerSubmit(onManagerSubmit)}
                        className="h-14 flex-1"
                        textClassName="font-bold"
                        loading={machineState === 'cancelling'}
                      />
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </ModalBase>
      )
    },
  ),
)

const styles = StyleSheet.create({
  managerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  managerCard: {
    width: 550,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e0e1e2',
    padding: 32,
    gap: 24,
    shadowColor: '#a8a8a8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  managerCardHeader: {
    gap: 8,
  },
  managerCardTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 28,
    lineHeight: 36,
    color: '#282929',
    textAlign: 'center',
  },
  managerCardSubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
  },
  managerFormGroup: {
    gap: 16,
  },
})

MixPaymentPopup.displayName = 'MixPaymentPopup'
export default MixPaymentPopup
