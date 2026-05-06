import { Button } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAuthStore } from '@/shared/features/auth'
import {
  calculateVoucherDiscount,
  PAYMENT_REGISTRY,
  PaymentContext,
  usePaymentFlow,
} from '@/shared/features/payment'
import { formatCurrency } from '@/shared/utils'
import { PenSquare } from 'lucide-react-native'
import React, { useMemo } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useCartStore } from '../store'

export default function CheckoutPanel() {
  const { sessions, activeSessionId, setNote } = useCartStore()
  const { session } = useAuthStore()

  const activeSession = activeSessionId ? sessions[activeSessionId] : null
  const cart = useMemo(() => {
    return activeSession ? Object.values(activeSession.items) : []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.items])

  const appliedVoucher = activeSession?.appliedVoucher || null
  const note = activeSession?.note || ''

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  }, [cart])

  const totalQty = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  const discount = useMemo(() => {
    return calculateVoucherDiscount(subtotal, appliedVoucher, activeSession?.discount)
  }, [subtotal, appliedVoucher, activeSession?.discount])

  const tax = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + item.product.price * (item.product.taxRate / 100) * item.quantity,
      0,
    )
  }, [cart])

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount) + tax
  }, [subtotal, discount, tax])

  const paymentContext: PaymentContext = useMemo(
    () => ({
      total,
      sessionId: activeSessionId,
      items: cart,
      discount,
    }),
    [total, activeSessionId, cart, discount],
  )

  const { refs, startPayment, handleCheckoutSuccess } = usePaymentFlow(paymentContext)

  return (
    <View className="z-10 flex-row items-stretch gap-10 border-t border-[#e2e8f0] bg-white px-8 py-6 shadow-lg shadow-black/10">
      {/* 1. Left: Order Note */}
      <View className="min-w-[280px] flex-1 flex-col">
        <Text className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">
          Order Note
        </Text>
        <TextInput
          className="flex-1 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4 text-base text-surface-on"
          placeholder="Enter note for this order..."
          multiline
          textAlignVertical="top"
          value={note}
          onChangeText={setNote}
        />
      </View>

      {/* 2. Middle: Calculation Summary */}
      <View className="min-w-[300px] flex-1 flex-col justify-center gap-3 border-x border-dashed border-[#e2e8f0] px-8">
        <View className="flex-row items-center justify-between">
          <Text className="text-base text-muted" numberOfLines={1}>
            Total Qty
          </Text>
          <Text className="text-lg font-bold text-black" numberOfLines={1}>
            {totalQty}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-base text-muted" numberOfLines={1}>
            Subtotal
          </Text>
          <Text className="text-lg font-bold text-black" numberOfLines={1}>
            {formatCurrency(subtotal)}
          </Text>
        </View>
        <Pressable
          className="flex-row items-center justify-between"
          onPress={() => {
            // Handle discount edit
          }}
        >
          <View className="flex-row items-center gap-1.5">
            <Text className="text-base font-bold text-primary" numberOfLines={1}>
              Discount
            </Text>
            <PenSquare size={16} color={COLORS.primary.default} />
          </View>
          <Text className="text-lg font-bold text-primary" numberOfLines={1}>
            {formatCurrency(discount)}
          </Text>
        </Pressable>
        <View className="flex-row items-center justify-between">
          <Text className="text-base text-muted" numberOfLines={1}>
            Tax
          </Text>
          <Text className="text-lg font-bold text-black" numberOfLines={1}>
            {formatCurrency(tax)}
          </Text>
        </View>
      </View>

      {/* 3. Right: Total & Payment Actions */}
      <View className="min-w-[500px] flex-col justify-between">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="mr-6 text-lg font-bold uppercase text-muted" numberOfLines={1}>
            Grand Total
          </Text>
          <Text
            className="flex-1 text-right text-[42px] font-extrabold tracking-[-1px] text-primary"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(total)}
          </Text>
        </View>

        <View className="h-[74px] flex-row items-stretch gap-4">
          {PAYMENT_REGISTRY.map((method) => (
            <Button
              key={method.type}
              label={method.label}
              leftIcon={method.icon}
              iconSize={24}
              variant="outline"
              className="flex-1"
              onPress={() => startPayment(method.type)}
              disabled={cart.length === 0}
            />
          ))}
        </View>
      </View>

      {/* Render Popups động từ Registry */}
      {PAYMENT_REGISTRY.map((method) => (
        <method.PopupComponent
          key={method.type}
          ref={(r) => {
            refs.current[method.type] = r
          }}
          total={total}
          discount={discount}
          voucherCode={appliedVoucher?.code}
          items={cart}
          staffId={session?.staffId ?? ''}
          shiftId={session?.shiftId ?? ''}
          activeSessionId={activeSessionId}
          onSuccess={handleCheckoutSuccess}
        />
      ))}
    </View>
  )
}
