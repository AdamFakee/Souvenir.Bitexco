import CashIcon from '@/assets/icons/Cash.svg'
import { BitexcoReceiptTemplate } from '@/features/order/components/bitexco-receipt-template'
import { ViceService } from '@/screens/vice-service'
import { Button, ModalBase, Numpad } from '@/shared/components/ui'
import { toast } from '@/shared/store'
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
  useState,
} from 'react'
import { ScrollView, Text, View } from 'react-native'

import { cashPaymentMachine, SavedOrder } from '@/core/payment-engine/machines/cash-payment.machine'
import { OrderStatus } from '@/shared/lib/database'
import { PaymentPopupProps, PaymentPopupRef } from '../types'
import {
  calculateLineDiscount,
  calculateSubtotal,
  calculateTotalTax,
  getCashSuggestions,
  roundCashAmount,
} from '../utils'

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Xây dựng IOrder đầy đủ để truyền vào BitexcoReceiptTemplate.
 * Snapshot items/payments luôn lấy từ cart UI hiện tại (source of truth cho in bill).
 */
function buildReceiptOrder(
  savedOrder: SavedOrder,
  items: CartItem[],
  cashTendered: string,
  roundedTotal: number,
  subtotal: number,
  discount: number,
  staffId: string,
  shiftId: string,
  appliedVoucher?: AppliedVoucher | null,
): IOrder {
  const orderId = savedOrder.source === 'online' ? savedOrder.orderCode : savedOrder.id
  const totalTax = calculateTotalTax(items, appliedVoucher)

  return {
    id: orderId,
    shiftId,
    staffId,
    status: OrderStatus.COMPLETED,
    subtotal,
    discount,
    voucherDiscount: discount,
    total: roundedTotal,
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
        method: 'cash',
        amount: roundedTotal,
        cashTendered: Number(cashTendered) || roundedTotal,
        cashChange: Number(cashTendered) >= roundedTotal ? Number(cashTendered) - roundedTotal : 0,
      },
    ],
  }
}

// ─── Static machine (không recreate mỗi render) ───────────────────────────────

const cashMachine = cashPaymentMachine.provide({
  actions: {
    notifyError: ({ context }) => {
      toast.error(context.error || 'Thanh toán tiền mặt thất bại. Vui lòng thử lại!')
    },
    notifyCancel: () => {
      toast.info('Giao dịch đã bị hủy')
    },
  },
})

/**
 * Popup thanh toán tiền mặt — driven by `cashPaymentMachine`.
 */
export const CashPaymentPopup = memo(
  forwardRef<PaymentPopupRef, PaymentPopupProps>(
    (
      {
        total,
        discount,
        items,
        staffId,
        shiftId,
        staffName,
        activeSessionId,
        appliedVoucher,
        printRef,
        onSuccess,
        note,
        affiliate,
      },
      ref,
    ) => {
      const [visible, setVisible] = useState(false)
      const [cashTendered, setCashTendered] = useState('')

      const roundedTotal = roundCashAmount(total)

      // Cache tính toán
      const totals = useMemo(
        () => ({
          subtotal: calculateSubtotal(items),
          tax: calculateTotalTax(items, appliedVoucher),
        }),
        [items, appliedVoucher],
      )

      // Khởi tạo actor với machine tĩnh
      const actorRef = useActorRef(cashMachine, {
        input: {
          total: roundedTotal,
          discount,
          items,
          staffId,
          shiftId,
          sessionId: shiftId || 'unknown',
          appliedVoucher: appliedVoucher || null,
          printRef,
          affiliateId: affiliate?.id ?? null,
          affiliateName: affiliate?.name ?? null,
          agentType: affiliate?.agentType ?? null,
          note: note || null,
        },
      })

      // Gộp selector với equality check tránh re-render liên tục
      const ctx = useSelector(
        actorRef,
        (s) => ({
          state: s.value,
          error: s.context.error,
          retryCount: s.context.retryCount,
          savedOrder: s.context.savedOrder,
          amountTendered: s.context.amountTendered,
          machineTotal: s.context.total,
          canConfirm: s.can({ type: 'CONFIRM' }),
          canRetry: s.can({ type: 'RETRY' }),
        }),
        (prev, next) =>
          prev.state === next.state &&
          prev.error === next.error &&
          prev.retryCount === next.retryCount &&
          prev.savedOrder === next.savedOrder &&
          prev.amountTendered === next.amountTendered &&
          prev.machineTotal === next.machineTotal &&
          prev.canConfirm === next.canConfirm &&
          prev.canRetry === next.canRetry,
      )

      const { state: machineState, error, retryCount, savedOrder, canConfirm, canRetry } = ctx

      const isProcessing =
        machineState === 'savingOrder' ||
        machineState === 'preparingReceipt' ||
        machineState === 'printingReceipt' ||
        machineState === 'success'
      const isError = machineState === 'error'
      const isSuccess = machineState === 'success'

      // Gộp effect ViceService (hoãn sang frame kế tiếp để không block animation mở popup)
      useEffect(() => {
        if (!visible) return

        const handle = requestAnimationFrame(() => {
          if (isSuccess) {
            const paid = Number(cashTendered)
            const changeAmt = paid >= roundedTotal ? paid - roundedTotal : 0

            ViceService.paymentSuccess({
              subtotal: totals.subtotal,
              discount,
              tax: totals.tax,
              total: roundedTotal,
              customerPaid: paid,
              change: changeAmt,
            })

            setVisible(false)
            onSuccess({
              success: true,
              method: 'cash',
              paidAmount: paid,
              change: changeAmt,
              isOnline: savedOrder?.source === 'online',
            })
          } else {
            const paid = Number(cashTendered) || 0
            const changeAmt = paid >= roundedTotal ? paid - roundedTotal : 0
            ViceService.showCashPayment({
              subtotal: totals.subtotal,
              discount,
              tax: totals.tax,
              total: roundedTotal,
              customerPaid: paid,
              change: changeAmt,
            })
          }
        })

        return () => cancelAnimationFrame(handle)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [visible, isSuccess, cashTendered, roundedTotal, discount, totals.subtotal, totals.tax])

      useImperativeHandle(
        ref,
        () => ({
          open: () => {
            setCashTendered('')
            setVisible(true)

            const freshInput = {
              total: roundedTotal,
              discount,
              items,
              staffId,
              shiftId,
              sessionId: shiftId || 'unknown',
              appliedVoucher: appliedVoucher || null,
              printRef,
              affiliateId: affiliate?.id ?? null,
              agentType: affiliate?.agentType ?? null,
              note: note || null,
            }

            actorRef.send({ type: 'START', input: freshInput })
          },
          close: () => {
            setVisible(false)
            actorRef.send({ type: 'CANCEL' })
          },
        }),
        // Chỉ giữ các ref-stable dependencies
        [
          roundedTotal,
          discount,
          items,
          staffId,
          shiftId,
          appliedVoucher,
          printRef,
          affiliate,
          note,
          actorRef,
          totals.subtotal,
          totals.tax,
        ],
      )

      // Cập nhật giá trị vào Machine
      useEffect(() => {
        if (!visible) return
        const paid = Number(cashTendered) || 0
        actorRef.send({ type: 'SET_AMOUNT', amount: paid })
      }, [cashTendered, visible, actorRef])

      const handleNumpadPress = useCallback((digit: string) => {
        setCashTendered((prev) => {
          if (prev.length < 12) {
            return prev + digit
          }
          return prev
        })
      }, [])

      const handleNumpadBackspace = useCallback(() => {
        setCashTendered((prev) => prev.slice(0, -1))
      }, [])

      const handleNumpadClear = useCallback(() => {
        setCashTendered('')
      }, [])

      const handleClose = useCallback(() => {
        actorRef.send({ type: 'CANCEL' })
        setVisible(false)
      }, [actorRef])

      const handleConfirm = useCallback(() => {
        actorRef.send({ type: 'CONFIRM' })
      }, [actorRef])

      const handleRetry = useCallback(() => {
        actorRef.send({ type: 'RETRY' })
      }, [actorRef])

      const suggestions = useMemo<number[]>(() => {
        return getCashSuggestions(roundedTotal, cashTendered)
      }, [roundedTotal, cashTendered])

      const receiptOrder = useMemo<IOrder | null>(() => {
        if (!savedOrder) return null
        return buildReceiptOrder(
          savedOrder,
          items,
          cashTendered,
          roundedTotal,
          totals.subtotal,
          discount,
          staffId,
          shiftId,
          appliedVoucher,
        )
      }, [
        savedOrder,
        items,
        cashTendered,
        roundedTotal,
        totals.subtotal,
        discount,
        staffId,
        shiftId,
        appliedVoucher,
      ])

      return (
        <ModalBase
          visible={visible}
          onClose={handleClose}
          dismissible={!isProcessing}
          className="max-w-[1100px] flex-row"
        >
          {visible && (
            <>
              {/* Left Side: Transaction Details */}
              <View className="flex-1 justify-between border-r border-outline-variant bg-surface-100 p-10">
                <View>
                  <View className="mb-8 flex-row items-center gap-4">
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
                      <CashIcon width={32} height={32} />
                    </View>
                    <Text className="text-4xl font-bold text-surface-on">Thanh toán Tiền mặt</Text>
                  </View>

                  <View className="gap-4">
                    {/* Total Amount */}
                    <View className="rounded-xl border border-outline-variant bg-surface-50 p-6">
                      <Text className="text-surface-onVariant mb-1 text-xl font-medium">
                        Tổng tiền
                      </Text>
                      <Text className="text-5xl font-bold text-primary">
                        {formatCurrency(roundedTotal)}
                      </Text>
                    </View>

                    {/* Cash Tendered */}
                    <View className="rounded-xl border-2 border-primary bg-primary/5 p-6">
                      <Text className="mb-1 text-xl font-bold text-primary">Khách đưa</Text>
                      <Text className="text-5xl font-bold text-surface-on">
                        {cashTendered ? formatCurrency(Number(cashTendered)) : '0 đ'}
                      </Text>
                    </View>

                    {/* Change Due */}
                    <View className="rounded-xl border border-error/20 bg-error/10 p-6">
                      <Text className="mb-1 text-xl font-medium text-error">Tiền thừa</Text>
                      <Text className="text-4xl font-bold text-error">
                        {Number(cashTendered) >= roundedTotal
                          ? formatCurrency(Number(cashTendered) - roundedTotal)
                          : '0 đ'}
                      </Text>
                    </View>

                    {/* Error banner */}
                    {isError && (
                      <View className="rounded-xl border border-error/30 bg-error/10 p-6">
                        <Text className="text-xl font-semibold text-error">
                          ⚠ {error ?? 'Đã xảy ra lỗi'}
                        </Text>
                        {retryCount >= 3 && (
                          <Text className="mt-1 text-lg text-error/70">
                            Đã hết lần thử lại. Vui lòng hủy giao dịch.
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {/* Denomination Shortcuts */}
                <View className="mt-8">
                  <Text className="text-surface-onVariant mb-4 text-lg font-bold uppercase tracking-wider">
                    Gợi ý nhanh
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="w-full"
                    contentContainerStyle={{ flexGrow: 1, gap: 8 }}
                  >
                    {suggestions.map((amount: number, index: number) => (
                      <Button
                        key={`suggestion-${index}-${amount}`}
                        label={formatCurrency(amount)}
                        variant="outline"
                        disabled={isProcessing}
                        className="h-16 min-w-[140px] flex-1"
                        onPress={() => setCashTendered(amount.toString())}
                      />
                    ))}
                  </ScrollView>

                  <Button
                    label="Chẵn tiền"
                    variant="outline"
                    disabled={isProcessing}
                    className="mt-4 h-16 w-full"
                    onPress={() => setCashTendered(roundedTotal.toString())}
                  />
                </View>
              </View>

              {/* Right Side: Numpad & Actions */}
              <View className="w-[480px] justify-between bg-surface-50 p-10">
                <View>
                  <Numpad
                    onPress={handleNumpadPress}
                    onBackspace={handleNumpadBackspace}
                    onClear={handleNumpadClear}
                  />
                </View>

                {/* Action Buttons */}
                <View className="mt-8 gap-3">
                  {/* Nút Thử lại — chỉ hiện khi có lỗi, disabled khi hết retry */}
                  {isError && (
                    <Button
                      label="Thử lại"
                      variant="primary"
                      disabled={!canRetry || isProcessing}
                      onPress={handleRetry}
                      className="h-20"
                    />
                  )}

                  {/* Nút Hoàn tất — disabled bằng guard canConfirm */}
                  {!isError && (
                    <Button
                      label="Hoàn tất"
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
              </View>

              {/* Hidden Printer Template — Rendered inside popup using real saved data */}
              <View style={{ position: 'absolute', left: -2000, top: 0 }}>
                {(isProcessing || isSuccess) && receiptOrder && (
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

CashPaymentPopup.displayName = 'CashPaymentPopup'
export default CashPaymentPopup
