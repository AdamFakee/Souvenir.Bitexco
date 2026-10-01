import DebtIcon from '@/assets/icons/Debt.svg'
import { debtPaymentMachine } from '@/core/payment-engine/machines/debt-payment.machine'
import { BitexcoReceiptTemplate } from '@/features/order/components/bitexco-receipt-template'
import { Button, ModalBase, Shimmer } from '@/shared/components/ui'
import { OrderStatus } from '@/shared/lib/database'
import { toast } from '@/shared/store/use-alert-store'
import { AppliedVoucher, CartItem, IOrder } from '@/shared/types'
import { formatCurrency } from '@/shared/utils'
import { useActorRef, useSelector } from '@xstate/react'
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Text, View } from 'react-native'
import type {
  PaymentPopupProps,
  PaymentPopupRef,
  PaymentResult,
} from '../types/payment-strategy.type'
import { calculateLineDiscount, calculateSubtotal, calculateTotalTax } from '../utils'

function buildReceiptOrder(
  savedOrder: any,
  items: CartItem[],
  total: number,
  subtotal: number,
  discount: number,
  staffId: string,
  shiftId: string,
  appliedVoucher?: AppliedVoucher | null,
): IOrder {
  const orderId = savedOrder.orderCode || savedOrder.orderId || '---'
  const totalTax = calculateTotalTax(items, appliedVoucher)

  return {
    id: orderId,
    code: savedOrder.orderCode || null,
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
      const preTax = i.price * i.quantity
      const netPrice = Math.max(0, preTax - lineDiscount)
      const taxRate = i.product.taxRate ?? 0
      const taxAmount = taxRate > 0 ? Math.round(netPrice * (taxRate / (100 + taxRate))) : 0
      return {
        productId: i.product.id,
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
    paymentsSnapshot: [
      {
        method: 'cong_no',
        amount: total,
        cashTendered: 0,
        cashChange: 0,
      },
    ],
  }
}

export const DebtPaymentPopup = memo(
  forwardRef<PaymentPopupRef, PaymentPopupProps>(function DebtPaymentPopup(
    {
      total,
      items,
      affiliate,
      staffId,
      shiftId,
      staffName,
      appliedVoucher,
      discount,
      printRef,
      onSuccess,
      note,
    },
    ref,
  ) {
    const [visible, setVisible] = useState(false)

    const maxAllowedDebt = useMemo(() => {
      if (!affiliate) return null
      return affiliate.remainingCredit !== undefined && affiliate.remainingCredit !== null
        ? affiliate.remainingCredit
        : (affiliate.creditLimit ?? null)
    }, [affiliate])

    const subtotal = useMemo(() => calculateSubtotal(items), [items])

    const actorRef = useActorRef(debtPaymentMachine, {
      input: {
        total,
        items,
        affiliateId: affiliate?.id ?? null,
        agentType: affiliate?.agentType ?? null,
        shiftId,
        discount,
        appliedVoucher: appliedVoucher || null,
        printRef,
        note: note || null,
      },
    })

    // Gộp selector
    const ctx = useSelector(actorRef, (s) => ({
      state: s.value,
      error: s.context.error,
      savedOrder: s.context.savedOrder,
    }))

    const { state: machineState, error, savedOrder } = ctx

    const isCheckingOut =
      machineState === 'checkingOut' ||
      machineState === 'preparingReceipt' ||
      machineState === 'printingReceipt'
    const isError = machineState === 'error'
    const isDone = machineState === 'done'

    useImperativeHandle(ref, () => ({
      open: () => {
        actorRef.send({
          type: 'START',
          input: {
            total,
            items,
            affiliateId: affiliate?.id ?? null,
            agentType: affiliate?.agentType ?? null,
            shiftId,
            discount,
            appliedVoucher: appliedVoucher || null,
            printRef,
            note: note || null,
          },
        })
        setVisible(true)
      },
      close: () => setVisible(false),
    }))

    const handleConfirm = useCallback(() => {
      if (isCheckingOut || isDone) return
      if (affiliate?.agentType === 'agent' && maxAllowedDebt !== null) {
        if (total > maxAllowedDebt) {
          toast.infoPopup({
            title: 'Vượt hạn mức công nợ',
            message: `Giao dịch vượt quá hạn mức công nợ khả dụng (${formatCurrency(maxAllowedDebt)}) của đối tác.`,
          })
          return
        }
      }
      actorRef.send({ type: 'CONFIRM' })
    }, [isCheckingOut, isDone, affiliate, maxAllowedDebt, total, actorRef])

    const handleClose = useCallback(() => {
      if (isCheckingOut) return
      setVisible(false)
    }, [isCheckingOut])

    const doneHandled = useRef(false)

    useEffect(() => {
      if (isDone && visible && !doneHandled.current) {
        doneHandled.current = true
        setVisible(false)
        const result: PaymentResult = {
          success: true,
          method: 'cong_no',
          paidAmount: total,
          change: 0,
          isOnline: true,
        }
        onSuccess(result)
      }
      if (!isDone) {
        doneHandled.current = false
      }
    }, [isDone, visible, total, onSuccess])

    useEffect(() => {
      if (isError && error) {
        if (
          error.startsWith('order.credit_limit_exceeded') ||
          error.includes('hạn mức') ||
          error.includes('limit')
        ) {
          toast.infoPopup({
            title: 'Vượt hạn mức công nợ',
            message: 'Giao dịch vượt quá hạn mức công nợ cho phép của đối tác.',
          })
        } else {
          toast.error(error)
        }
      }
    }, [isError, error])

    return (
      <ModalBase
        visible={visible}
        onClose={handleClose}
        dismissible={!isCheckingOut}
        className="max-w-[680px]"
      >
        {visible && (
          <View className="gap-6 bg-surface-100 p-10">
            {/* Header */}
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
                <DebtIcon width={32} height={32} />
              </View>
              <View className="w-full">
                <Text className="text-4xl font-bold text-surface-on">Thanh toán Công nợ</Text>
              </View>
            </View>

            {/* Affiliate info */}
            {affiliate && (
              <View className="gap-4 rounded-xl border border-outline-variant bg-surface-50 p-6">
                <View className="flex-row items-center justify-between gap-4">
                  <Text className="shrink-0 text-xl font-medium text-muted">Đối tác</Text>
                  <Text
                    className="flex-1 text-right text-xl font-bold text-surface-on"
                    numberOfLines={1}
                  >
                    {affiliate.name}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between gap-4">
                  <Text className="shrink-0 text-lg text-muted">Mã</Text>
                  <Text
                    className="flex-1 text-right text-lg font-semibold text-surface-on"
                    numberOfLines={1}
                  >
                    {affiliate.code}
                  </Text>
                </View>
                {!!affiliate.phone && (
                  <View className="flex-row items-center justify-between gap-4">
                    <Text className="shrink-0 text-lg text-muted">Số điện thoại</Text>
                    <Text
                      className="flex-1 text-right text-lg font-semibold text-surface-on"
                      numberOfLines={1}
                    >
                      {affiliate.phone}
                    </Text>
                  </View>
                )}
                <View className="flex-row items-center justify-between gap-4">
                  <Text className="shrink-0 text-lg text-muted">Hạn mức nợ (Còn lại / Tối đa)</Text>
                  <Text
                    className="flex-1 text-right text-lg font-semibold text-surface-on"
                    numberOfLines={1}
                  >
                    {affiliate.remainingCredit !== undefined && affiliate.remainingCredit !== null
                      ? `${formatCurrency(affiliate.remainingCredit)} / `
                      : ''}
                    {affiliate.creditLimit !== undefined && affiliate.creditLimit !== null
                      ? formatCurrency(affiliate.creditLimit)
                      : 'Không giới hạn'}
                  </Text>
                </View>
              </View>
            )}

            {/* Total Amount */}
            <View className="flex-row items-center justify-between rounded-xl border border-outline-variant bg-surface-50 p-6">
              <Text className="mb-1 text-xl font-medium text-muted" numberOfLines={1}>
                Số tiền ghi nợ
              </Text>
              {isCheckingOut ? (
                <Shimmer className="mt-1 h-12 w-56 rounded-xl" />
              ) : (
                <Text className="text-5xl font-bold text-primary" numberOfLines={1}>
                  {formatCurrency(total)}
                </Text>
              )}
            </View>

            {/* Credit limit warning */}
            {affiliate?.agentType === 'agent' &&
              maxAllowedDebt !== null &&
              total > maxAllowedDebt && (
                <View className="rounded-xl border border-error/30 bg-error/10 p-5">
                  <Text className="text-xl font-semibold text-error">
                    ⚠ Vượt hạn mức công nợ (
                    {affiliate.remainingCredit !== undefined && affiliate.remainingCredit !== null
                      ? formatCurrency(affiliate.remainingCredit)
                      : '0'}{' '}
                    /{' '}
                    {affiliate.creditLimit !== undefined && affiliate.creditLimit !== null
                      ? formatCurrency(affiliate.creditLimit)
                      : '∞'}
                    )
                  </Text>
                </View>
              )}

            {/* Error banner */}
            {isError && error && (
              <View className="rounded-xl border border-error/30 bg-error/10 p-6">
                <Text className="text-xl font-semibold text-error">⚠ {error}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View className="gap-3">
              <Button
                label="Xác nhận ghi nợ"
                variant="primary"
                onPress={handleConfirm}
                disabled={isCheckingOut || isDone}
                loading={isCheckingOut}
                className="h-20"
              />
              <Button
                label="Hủy giao dịch"
                variant="error"
                onPress={handleClose}
                disabled={isCheckingOut}
                className="h-16"
              />
            </View>

            {/* Hidden Printer Template — Rendered inside popup using real saved data */}
            <View style={{ position: 'absolute', left: -2000, top: 0 }}>
              {(isCheckingOut || isDone) && savedOrder && (
                <View collapsable={false} ref={printRef}>
                  <BitexcoReceiptTemplate
                    order={buildReceiptOrder(
                      savedOrder,
                      items,
                      total,
                      subtotal,
                      discount,
                      staffId,
                      shiftId,
                      appliedVoucher,
                    )}
                    staffName={staffName}
                  />
                </View>
              )}
            </View>
          </View>
        )}
      </ModalBase>
    )
  }),
)

DebtPaymentPopup.displayName = 'DebtPaymentPopup'
export default DebtPaymentPopup
