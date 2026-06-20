import { ViceService } from '@/screens/vice-service'
import { Button, ModalBase, Numpad } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { BitexcoReceiptTemplate } from '@/shared/features/order/components/bitexco-receipt-template'
import { IOrder } from '@/shared/features/order/types'
import { toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { useActorRef, useSelector } from '@xstate/react'
import { Banknote } from 'lucide-react-native'
import React, { forwardRef, useEffect, useImperativeHandle, useState, memo } from 'react'
import { ScrollView, Text, View } from 'react-native'

import type { CartItem } from '@/shared/features/pos'
import { OrderStatus } from '@/shared/lib/database'
import { cashPaymentMachine, SavedOrder } from '../machines/cash-payment.machine'
import { PaymentPopupProps, PaymentPopupRef } from '../types'
import { calculateSubtotal, calculateTotalTax, getCashSuggestions, roundCashAmount } from '../utils'

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
): IOrder {
  const orderId = savedOrder.source === 'online' ? savedOrder.orderCode : savedOrder.id
  const totalTax = items.reduce(
    (sum, i) => sum + i.price * i.quantity * ((i.product.taxRate ?? 0) / 100),
    0,
  )

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
    itemsSnapshot: items.map((i) => ({
      productId: i.product.id,
      sku: i.product.sku,
      name: i.product.name,
      price: i.price,
      quantity: i.quantity,
      subtotal: i.price * i.quantity,
      taxRate: i.product.taxRate ?? 0,
      taxAmount: i.price * i.quantity * ((i.product.taxRate ?? 0) / 100),
      discountAmount: i.discountAmount ?? 0,
    })),
    paymentsSnapshot: [
      {
        method: 'cash',
        amount: Number(cashTendered) || roundedTotal,
        cashTendered: Number(cashTendered) || roundedTotal,
        cashChange: Number(cashTendered) >= roundedTotal ? Number(cashTendered) - roundedTotal : 0,
      },
    ],
  }
}

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
      },
      ref,
    ) => {
      const [visible, setVisible] = useState(false)
      const [cashTendered, setCashTendered] = useState('')

      const roundedTotal = roundCashAmount(total)
      const subtotal = calculateSubtotal(items)

      // Khởi tạo actor với toàn bộ context
      const actorRef = useActorRef(
        cashPaymentMachine.provide({
          actions: {
            notifyError: ({ context }) => {
              toast.error(context.error || 'Thanh toán tiền mặt thất bại. Vui lòng thử lại!')
            },
            notifyCancel: () => {
              toast.info('Giao dịch đã bị hủy')
            },
          },
        }),
        {
          input: {
            total: roundedTotal,
            discount,
            items,
            staffId,
            shiftId,
            sessionId: shiftId || 'unknown', // shiftId = cashSessionId UUID từ server
            appliedVoucher: appliedVoucher || null,
            printRef,
          },
        },
      )

      // Selector cho các trạng thái cần reactive
      const machineState = useSelector(actorRef, (s) => s.value)
      const error = useSelector(actorRef, (s) => s.context.error)
      const retryCount = useSelector(actorRef, (s) => s.context.retryCount)

      const isProcessing = machineState === 'savingOrder' || machineState === 'printingReceipt'
      const isError = machineState === 'error'
      const isSuccess = machineState === 'success'

      // Kiểm tra guard
      const savedOrder = useSelector(actorRef, (s) => s.context.savedOrder)
      const canConfirm = useSelector(actorRef, (s) => {
        const { amountTendered, total } = s.context
        return amountTendered >= roundCashAmount(total) && amountTendered > 0
      })
      const canRetry = useSelector(actorRef, (s) => s.can({ type: 'RETRY' }))

      // Khi machine đến success → gọi onSuccess và đóng popup
      useEffect(() => {
        if (!isSuccess || !visible) return

        const paid = Number(cashTendered)
        const changeAmt = paid >= roundedTotal ? paid - roundedTotal : 0
        const tax = calculateTotalTax(items)

        ViceService.paymentSuccess({
          subtotal,
          discount,
          tax,
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [isSuccess, visible])

      useImperativeHandle(ref, () => ({
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
          }

          // Khởi động lại machine với dữ liệu mới nhất
          actorRef.send({ type: 'START', input: freshInput })

          const subtotal = calculateSubtotal(items)
          const tax = calculateTotalTax(items)
          ViceService.showCashPayment({
            subtotal,
            discount,
            tax,
            total: roundedTotal,
            customerPaid: 0,
            change: 0,
          })
        },
        close: () => {
          setVisible(false)
          actorRef.send({ type: 'CANCEL' })
        },
      }))

      // Debounce cập nhật Vice Screen
      useEffect(() => {
        if (!visible) return
        const timer = setTimeout(() => {
          const paid = Number(cashTendered) || 0
          const changeAmt = paid >= roundedTotal ? paid - roundedTotal : 0
          const subtotal = calculateSubtotal(items)
          const tax = calculateTotalTax(items)
          ViceService.showCashPayment({
            subtotal,
            discount,
            tax,
            total: roundedTotal,
            customerPaid: paid,
            change: changeAmt,
          })

          // Đồng bộ SET_AMOUNT vào machine để guard canConfirm phản hồi đúng
          actorRef.send({ type: 'SET_AMOUNT', amount: paid })
        }, 300)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [cashTendered, roundedTotal, visible])

      // Trả màn hình phụ về Home khi đóng popup tiền mặt (hủy giao dịch)
      useEffect(() => {
        if (!visible && !isSuccess) {
          const subtotal = calculateSubtotal(items)
          const tax = calculateTotalTax(items)
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
            total: roundedTotal,
          })
        }
      }, [visible, isSuccess, items, discount, roundedTotal])

      const handleNumpadPress = (digit: string) => {
        if (cashTendered.length < 12) {
          setCashTendered((prev) => prev + digit)
        }
      }
      const handleNumpadBackspace = () => setCashTendered((prev) => prev.slice(0, -1))
      const handleNumpadClear = () => setCashTendered('')

      const handleClose = () => {
        actorRef.send({ type: 'CANCEL' })
        setVisible(false)
      }

      const handleConfirm = () => {
        actorRef.send({ type: 'CONFIRM' })
      }

      const handleRetry = () => {
        actorRef.send({ type: 'RETRY' })
      }

      const suggestions = getCashSuggestions(roundedTotal, cashTendered)

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
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Banknote size={32} color={COLORS.primary.default} />
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
                    {suggestions.map((amount, index) => (
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
                {savedOrder && (
                  <View collapsable={false} ref={printRef}>
                    <BitexcoReceiptTemplate
                      order={buildReceiptOrder(
                        savedOrder,
                        items,
                        cashTendered,
                        roundedTotal,
                        subtotal,
                        discount,
                        staffId,
                        shiftId,
                      )}
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

CashPaymentPopup.displayName = 'CashPaymentPopup'
export default CashPaymentPopup
