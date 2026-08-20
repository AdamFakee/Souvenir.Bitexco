import { ViceService } from '@/screens/vice-service'
import { useTenantConfig } from '@/shared/features/app/hooks/use-app-context'
import { toast } from '@/shared/store/use-alert-store'
import NetInfo from '@react-native-community/netinfo'
import { useActorRef, useSelector } from '@xstate/react'
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import { exchangeQrPaymentMachine } from '../machines/exchange-qr-payment.machine'
import { PaymentPopupProps, getPaymentErrorStatus } from '../types'
import { calculateLineDiscount, calculateSubtotal, calculateTotalTax } from '../utils'
import { QrPaymentView } from './qr-payment-view'

export type ExchangeQrOpenInput = {
  paymentId: string
  /** UUID order (cancel/void) — không dùng billNumber/orderCode */
  orderId: string
  billNumber: string
}

export interface ExchangeQrPaymentPopupProps extends PaymentPopupProps {
  onCancel?: () => void
}

export interface ExchangeQrPaymentPopupRef {
  open: (overrideInput?: ExchangeQrOpenInput) => void | Promise<void>
  close: () => void
}

/** Exchange QR container — binds `exchangeQrPaymentMachine` (seeded paymentId) */
export const ExchangeQrPaymentPopup = memo(
  forwardRef<ExchangeQrPaymentPopupRef, ExchangeQrPaymentPopupProps>(
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
        onCancel,
        affiliate,
      },
      ref,
    ) => {
      const [visible, setVisible] = useState(false)
      const [timeLeftSecs, setTimeLeftSecs] = useState<number | null>(null)
      const tenantConfig = useTenantConfig()

      const timeLeft = useMemo(() => {
        if (timeLeftSecs === null) return '05:00'
        const mins = Math.floor(timeLeftSecs / 60)
        const secs = timeLeftSecs % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }, [timeLeftSecs])

      // Cache tính toán
      const totals = useMemo(
        () => ({
          subtotal: calculateSubtotal(items),
          tax: calculateTotalTax(items, appliedVoucher),
        }),
        [items, appliedVoucher],
      )

      const actorRef = useActorRef(exchangeQrPaymentMachine, {
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
          affiliateId: affiliate?.id ?? null,
          agentType: affiliate?.agentType ?? null,
          orderId: '',
          paymentId: '',
          billNumber: '',
        },
      })

      // Gộp selector
      const ctx = useSelector(actorRef, (s) => ({
        state: s.value,
        qrContent: s.context.qrContent,
        expiresAt: s.context.expiresAt,
        createdAt: s.context.createdAt,
        error: s.context.error,
        errorCode: s.context.errorCode,
        retryCount: s.context.retryCount,
        savedOrder: s.context.savedOrder,
        canRetry: s.can({ type: 'RETRY' }),
        canCancel: s.can({ type: 'CANCEL' }),
      }))

      const {
        state: machineState,
        qrContent,
        expiresAt,
        createdAt,
        error,
        errorCode,
        retryCount,
        savedOrder,
        canRetry,
        canCancel,
      } = ctx

      const isSuccess = machineState === 'success'
      const isError = machineState === 'error'
      const isCancelled = machineState === 'cancelled'
      const isFetchingQR = machineState === 'fetchingQR'
      const isWaiting = typeof machineState === 'object' && 'waitingForPayment' in machineState
      const isSaving = machineState === 'savingOrder'
      const isPreparing = machineState === 'preparingReceipt'
      const isPrinting = machineState === 'printingReceipt'
      const isCanceling = machineState === 'cancelingPayment' || machineState === 'cancellingOrder'
      const isForceCapturing = machineState === 'forceCapturingPayment'
      const isProcessing = isForceCapturing || isSaving || isPreparing || isPrinting || isCanceling
      const isLoading =
        isFetchingQR || isWaiting || isSaving || isPrinting || isCanceling || isForceCapturing

      // Gộp effect ViceService
      useEffect(() => {
        if (!visible) return

        if (isSuccess) {
          ViceService.paymentSuccess({
            subtotal: totals.subtotal,
            discount,
            tax: totals.tax,
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
        }

        if (isError) {
          ViceService.showStatus(getPaymentErrorStatus(errorCode))
        } else if (qrContent) {
          ViceService.showPayment({
            qrCodeUrl: qrContent,
            subtotal: totals.subtotal,
            discount,
            tax: totals.tax,
            total,
          })
        }
      }, [
        visible,
        isSuccess,
        isError,
        qrContent,
        errorCode,
        totals.subtotal,
        totals.tax,
        discount,
        total,
        actorRef,
        onSuccess,
      ])

      // Trả ViceScreen về Home khi đóng
      useEffect(() => {
        if (!visible && !isSuccess) {
          ViceService.updateCart({
            items: items.map((i) => ({
              id: i.id,
              name: i.product.name,
              price: i.price,
              quantity: i.quantity,
            })),
            subtotal: totals.subtotal,
            discount,
            tax: totals.tax,
            total,
          })
        }
      }, [visible, isSuccess, items, discount, total, totals.subtotal, totals.tax])

      // Timer đếm ngược QR
      useEffect(() => {
        if (!visible || !qrContent || !expiresAt || !createdAt) {
          setTimeLeftSecs(null)
          return
        }
        const expiryTime = new Date(expiresAt).getTime()
        const startTime = new Date(createdAt).getTime()
        setTimeLeftSecs(Math.max(0, Math.floor((expiryTime - startTime) / 1000)))
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

      // Xử lý cancel
      useEffect(() => {
        if (!isCancelled) return
        const timer = setTimeout(() => {
          setVisible(false)
          onCancel?.()
        }, 800)
        return () => clearTimeout(timer)
      }, [isCancelled, onCancel])

      // Memo các callback
      const handleCancel = useCallback(() => {
        toast.confirm({
          title: 'Xác nhận hủy giao dịch',
          message: 'Bạn có chắc chắn muốn hủy giao dịch thanh toán QR này không?',
          onConfirm: () => actorRef.send({ type: 'CANCEL' }),
        })
      }, [actorRef])

      const handleRetry = useCallback(() => {
        actorRef.send({ type: 'RETRY' })
      }, [actorRef])

      const handleCheckStatus = useCallback(() => {
        actorRef.send({ type: 'CHECK_STATUS_NOW' })
      }, [actorRef])

      const handleForceComplete = useCallback(() => {
        toast.confirm({
          title: 'Xác nhận thanh toán thủ công',
          message:
            'Bạn có chắc chắn muốn xác nhận khách đã chuyển khoản thành công và ghi nhận đơn hàng này không?',
          onConfirm: () => actorRef.send({ type: 'FORCE_COMPLETE' }),
        })
      }, [actorRef])

      useImperativeHandle(
        ref,
        () => ({
          open: async (overrideInput?: ExchangeQrOpenInput) => {
            const netState = await NetInfo.fetch()
            if (!netState.isConnected) {
              toast.error('Thanh toán QR yêu cầu kết nối mạng!')
              return
            }
            if (!overrideInput?.paymentId) {
              toast.error('Thiếu paymentId — không thể tạo mã QR đổi hàng.')
              onCancel?.()
              return
            }
            setVisible(true)
            actorRef.send({
              type: 'START',
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
                affiliateId: affiliate?.id ?? null,
                agentType: affiliate?.agentType ?? null,
                orderId: overrideInput.orderId,
                paymentId: overrideInput.paymentId,
                billNumber: overrideInput.billNumber || overrideInput.orderId,
              },
            })
          },
          close: () => actorRef.send({ type: 'CANCEL' }),
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
          affiliate,
          onCancel,
        ],
      )

      const receiptOrder = useMemo(() => {
        if (!savedOrder) return null
        return {
          ...savedOrder,
          id: savedOrder.id,
          total,
          subtotal: totals.subtotal,
          discount,
          totalTax: totals.tax,
          itemsSnapshot: items.map((i) => {
            const lineDiscount = calculateLineDiscount(i, items, appliedVoucher)
            const preTax = i.price * i.quantity
            const netPrice = Math.max(0, preTax - lineDiscount)
            const taxRate = i.product.taxRate || 0
            const taxAmount = taxRate > 0 ? Math.round(netPrice * (taxRate / (100 + taxRate))) : 0
            return {
              sku: i.product.sku,
              name: i.product.name,
              price: i.price,
              quantity: i.quantity,
              subtotal: preTax,
              taxRate,
              taxAmount,
              discountAmount: lineDiscount,
            }
          }),
          paymentsSnapshot: [{ method: 'qr_bidv', amount: total }],
        } as any
      }, [savedOrder, total, totals.subtotal, totals.tax, discount, items, appliedVoucher])

      return (
        <QrPaymentView
          visible={visible}
          isLoading={isLoading}
          isSuccess={isSuccess}
          isError={isError}
          canRetry={canRetry}
          canCancel={canCancel}
          qrContent={qrContent}
          error={error}
          retryCount={retryCount}
          timeLeft={timeLeft}
          subtotal={totals.subtotal}
          discount={discount}
          total={total}
          receiptOrder={receiptOrder}
          staffName={staffName}
          printRef={printRef}
          isForceCapturing={isForceCapturing}
          isProcessing={isProcessing}
          onCancel={handleCancel}
          onRetry={handleRetry}
          onCheckStatus={handleCheckStatus}
          onForceComplete={handleForceComplete}
        />
      )
    },
  ),
)

ExchangeQrPaymentPopup.displayName = 'ExchangeQrPaymentPopup'
export default ExchangeQrPaymentPopup
