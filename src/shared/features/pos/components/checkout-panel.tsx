import { Button, IconButton } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAuthStore } from '@/shared/features/auth'
import {
  calculateVoucherDiscount,
  PAYMENT_REGISTRY,
  PaymentContext,
  usePaymentFlow,
} from '@/shared/features/payment'
import { remoteVoucherApi } from '@/shared/features/payment/api/remote/voucher.remote.api'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { PenSquare, Ticket, XCircle } from 'lucide-react-native'
import React, { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useCartStore } from '../store'

export default function CheckoutPanel() {
  const { sessions, activeSessionId, applyVoucher, removeVoucher } = useCartStore()
  const { session } = useAuthStore()

  const [voucherInput, setVoucherInput] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const activeSession = activeSessionId ? sessions[activeSessionId] : null
  const cart = useMemo(() => {
    return activeSession ? Object.values(activeSession.items) : []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.items])

  const appliedVoucher = activeSession?.appliedVoucher || null

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  }, [cart])

  const totalQty = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  const discount = useMemo(() => {
    return calculateVoucherDiscount(cart, appliedVoucher)
  }, [cart, appliedVoucher])

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

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return

    setIsVerifying(true)
    try {
      const response = await remoteVoucherApi.verify({
        code: voucherInput,
        subtotal,
      })
      applyVoucher(response)
      setVoucherInput(response.code) // Giữ lại mã trong ô input
      toast.success(`Đã áp dụng mã giảm giá: ${response.code}`)
    } catch (error: any) {
      toast.error(error.message || 'Mã giảm giá không hợp lệ')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleRemoveVoucher = () => {
    removeVoucher()
    toast.info(' Đã gỡ mã giảm giá')
  }

  return (
    <View className="z-10 flex-row items-stretch gap-10 border-t border-[#e2e8f0] bg-white px-8 py-6 shadow-lg shadow-black/10">
      {/* 1. Left: Voucher Selection & Details */}
      <View className="min-w-[280px] flex-1 flex-col">
        {/* Voucher Info Details (Dạng dòng kẻ đồng bộ) */}
        <View className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] p-5">
          <Text className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">
            Voucher Information
          </Text>

          {appliedVoucher ? (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Mức giảm giá</Text>
                <Text className="text-base font-bold text-primary">{appliedVoucher.percent}%</Text>
              </View>

              {appliedVoucher.maxDiscountAmount && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted">Giảm tối đa</Text>
                  <Text className="text-base font-bold text-surface-on">
                    {formatCurrency(appliedVoucher.maxDiscountAmount)}
                  </Text>
                </View>
              )}

              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Phạm vi áp dụng</Text>
                <Text className="text-sm font-bold text-primary">
                  {appliedVoucher.applicableProductIds &&
                  appliedVoucher.applicableProductIds.length > 0
                    ? 'Sản phẩm chỉ định'
                    : 'Tất cả sản phẩm'}
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-4">
              <Text className="text-sm font-medium text-muted/60">Chưa có thông tin ưu đãi</Text>
            </View>
          )}
        </View>

        {/* Voucher Input Section */}
        <View className="mt-6">
          <Text className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">
            Voucher Code
          </Text>
          <View className="flex-row items-center gap-3">
            <View className="relative flex-1">
              <View className="absolute left-4 top-4 z-10">
                <Ticket size={20} color={COLORS.muted} />
              </View>
              <TextInput
                className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] py-3.5 pl-12 pr-4 text-base font-semibold text-surface-on"
                placeholder="Enter code..."
                value={voucherInput}
                onChangeText={setVoucherInput}
                autoCapitalize="characters"
                editable={!appliedVoucher && !isVerifying}
              />
            </View>
            {appliedVoucher ? (
              <IconButton
                icon={XCircle}
                size={28}
                color={COLORS.error.default}
                className="h-12 w-12 rounded-2xl border border-error/30 bg-error/10"
                onPress={handleRemoveVoucher}
              />
            ) : (
              <Button
                label="Apply"
                className="h-12 min-w-[100px] rounded-2xl"
                onPress={handleApplyVoucher}
                disabled={!voucherInput.trim() || isVerifying}
                loading={isVerifying}
              />
            )}
          </View>
        </View>
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
