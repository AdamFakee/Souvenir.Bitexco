import { Button, ControlledInput } from '@/shared/components/ui'
import { useAuthStore } from '@/shared/features/auth'
import {
  calculateVoucherDiscount,
  PAYMENT_REGISTRY,
  PaymentContext,
  useApplyVoucher,
  usePaymentFlow,
  VoucherSchema,
  type VoucherFormValues,
} from '@/shared/features/payment'
import { useIsOnline } from '@/shared/hooks'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Trash2 } from 'lucide-react-native'
import React, { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Text, View } from 'react-native'
import { useCartStore } from '../store'

export default function CheckoutPanel() {
  const { sessions, activeSessionId, removeCurrentCart, applyVoucher, removeVoucher } =
    useCartStore()

  const { isOfflineMode, session } = useAuthStore()
  const isOnline = useIsOnline()

  const { control, handleSubmit, setError, clearErrors, reset } = useForm<VoucherFormValues>({
    resolver: valibotResolver(VoucherSchema),
    defaultValues: { code: '' },
  })
  const { mutateAsync: applyVoucherAsync, isPending: isApplyingVoucher } = useApplyVoucher()

  const activeSession = activeSessionId ? sessions[activeSessionId] : null
  const cart = useMemo(() => {
    return activeSession ? Object.values(activeSession.items) : []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.items])

  const appliedVoucher = activeSession?.appliedVoucher || null

  useEffect(() => {
    reset({ code: appliedVoucher?.code || '' })
  }, [appliedVoucher?.code, reset])

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  }, [cart])

  const discount = useMemo(() => {
    return calculateVoucherDiscount(subtotal, appliedVoucher, activeSession?.discount)
  }, [subtotal, appliedVoucher, activeSession?.discount])

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount)
  }, [subtotal, discount])

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

  const availableMethods = PAYMENT_REGISTRY.filter((m) =>
    m.isAvailable(paymentContext, isOfflineMode),
  )

  // Lấy ra Cash để render riêng to hơn (hoặc dùng index nếu muốn render chung)
  const cashMethod = availableMethods.find((m) => m.type === 'CASH')
  const otherMethods = availableMethods.filter((m) => m.type !== 'CASH')

  const handleApplyVoucher = async (data: VoucherFormValues) => {
    if (!data.code) return
    try {
      clearErrors('code')
      const result = await applyVoucherAsync({
        code: data.code,
        subtotal,
      })
      applyVoucher(result)
    } catch (error: any) {
      setError('code', { message: error.message || 'Mã giảm giá không hợp lệ' })
    }
  }

  const handleRemoveVoucher = () => {
    removeVoucher()
    reset({ code: '' })
  }

  return (
    <View className="flex-1 flex-col justify-between bg-surface-100 p-6">
      {/* Top Section: Price Summary & Voucher */}
      <View>
        <View className="rounded-3xl border border-outline-variant bg-surface-50 p-8 shadow-sm">
          <View className="mb-5 flex-row justify-between">
            <Text className="text-title-sm text-surface-on-variant">Tạm tính:</Text>
            <Text className="text-title-sm font-semibold text-surface-on">
              {formatCurrency(subtotal)}
            </Text>
          </View>

          <View className="mb-8">
            <View className="flex-row justify-between">
              <Text className="text-title-sm font-semibold text-primary">Giảm giá (-):</Text>
              <Text className="text-title-sm font-bold text-primary">
                {discount > 0 ? `-${formatCurrency(discount)}` : '0 đ'}
              </Text>
            </View>
            {appliedVoucher && (
              <View className="mt-2 flex-row justify-end">
                <View className="flex-row items-center rounded-md bg-primary/10 px-2 py-1">
                  <Text className="text-md font-semibold text-primary">
                    Voucher {appliedVoucher.percent}%{' '}
                    {appliedVoucher.maxDiscountAmount
                      ? `(Tối đa ${formatCurrency(appliedVoucher.maxDiscountAmount)})`
                      : ''}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View className="mb-10 flex-row items-center justify-between border-t border-outline-variant pt-8">
            <Text className="text-headline-md font-extrabold text-surface-on">Tổng tiền:</Text>
            <Text className="text-display-sm font-black text-primary">{formatCurrency(total)}</Text>
          </View>

          {/* Voucher Input Area */}
          <View className="mt-2 border-t border-dashed border-outline-variant pt-8">
            <View className="mb-4">
              <Text className="text-xs font-black uppercase tracking-widest text-surface-on-variant">
                Mã giảm giá / Voucher
              </Text>
            </View>

            <View className="flex-row items-start gap-3">
              <View className="flex-1">
                <ControlledInput
                  control={control}
                  name="code"
                  placeholder="Nhập mã ưu đãi..."
                  autoCapitalize="characters"
                  className="h-14"
                  onSubmitEditing={handleSubmit(handleApplyVoucher)}
                  editable={!appliedVoucher && !isApplyingVoucher}
                />
              </View>
              {appliedVoucher ? (
                <Button
                  label="Hủy bỏ"
                  variant="error"
                  className="h-14 min-w-[100px] rounded-xl"
                  onPress={handleRemoveVoucher}
                />
              ) : (
                <Button
                  label="Áp dụng"
                  variant="primary"
                  className="h-14 min-w-[100px] rounded-xl"
                  onPress={handleSubmit(handleApplyVoucher)}
                  disabled={isApplyingVoucher || cart.length === 0 || !isOnline}
                  loading={isApplyingVoucher}
                />
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Section: Actions */}

      <View className="gap-4">
        <View className="mt-2 pt-4">
          <Button
            label="Hủy Đơn"
            variant="error"
            leftIcon={Trash2}
            className="h-16 rounded-xl border-none bg-transparent"
            textClassName="text-error"
            disabled={cart.length === 0 || isApplyingVoucher}
            onPress={() => {
              if (cart.length > 0) {
                toast.confirm({
                  title: 'Hủy đơn',
                  message: 'Bạn có chắc chắn muốn hủy đơn này không?',
                  onConfirm: removeCurrentCart,
                })
              }
            }}
          />
        </View>
        {/* Thanh toán trực tiếp */}
        <View className="flex-row gap-3">
          {cashMethod && (
            <Button
              key={cashMethod.type}
              label={cashMethod.label}
              variant="primary"
              leftIcon={cashMethod.icon}
              className="h-24 flex-1 rounded-2xl"
              textClassName="text-title-md"
              iconSize={28}
              disabled={cart.length === 0 || isApplyingVoucher}
              onPress={() => startPayment(cashMethod.type)}
            />
          )}
        </View>

        <View className="flex-row gap-3">
          {otherMethods.map((method) => (
            <Button
              key={method.type}
              label={method.label}
              variant="outline"
              leftIcon={method.icon}
              className="h-20 flex-1 rounded-2xl"
              disabled={cart.length === 0 || isApplyingVoucher}
              onPress={() => startPayment(method.type)}
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
