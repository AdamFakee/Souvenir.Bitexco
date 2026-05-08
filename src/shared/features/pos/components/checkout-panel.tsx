import { Button, IconButton } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAuthStore } from '@/shared/features/auth'
import { BitexcoReceiptTemplate } from '@/shared/features/order/components/bitexco-receipt-template'
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
import { KeyboardStickyView } from 'react-native-keyboard-controller'
import { useCartStore } from '../store'

export default function CheckoutPanel() {
  const { sessions, activeSessionId, applyVoucher, removeVoucher } = useCartStore()
  const { currentStaff, session } = useAuthStore()

  const [voucherInput, setVoucherInput] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const printRef = React.useRef(null)

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
      printRef,
    }),
    [total, activeSessionId, cart, discount, printRef],
  )

  const { refs, startPayment, handleCheckoutSuccess, lastPaymentResult } =
    usePaymentFlow(paymentContext)

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
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
      <View className="z-10 flex-row items-stretch gap-10 border-t border-outline-variant bg-surface-50 px-8 py-6 shadow-lg shadow-black/10">
        {/* Hidden Printer Template */}
        <View style={{ position: 'absolute', left: -2000, top: 0 }}>
          <View collapsable={false} ref={printRef}>
            <BitexcoReceiptTemplate
              order={
                {
                  id: lastPaymentResult?.orderId || '',
                  createdAt: new Date(),
                  total:
                    lastPaymentResult?.method === 'CASH' ? Math.round(total / 1000) * 1000 : total,
                  subtotal,
                  discount,
                  totalTax: tax,
                  itemsSnapshot: cart.map((i) => ({
                    sku: i.product.sku,
                    name: i.product.nameEn,
                    price: i.price,
                    quantity: i.quantity,
                    subtotal: i.price * i.quantity,
                  })),
                  paymentsSnapshot: lastPaymentResult
                    ? [
                        {
                          method: lastPaymentResult.method,
                          amount: lastPaymentResult.paidAmount,
                        },
                      ]
                    : [
                        {
                          method: 'CASH', // Default for preview/auto-print logic
                          amount: total,
                        },
                      ],
                  staffId: session?.staffId,
                } as any
              }
              staffName={currentStaff?.fullname}
            />
          </View>
        </View>

        {/* 1. Left: Voucher Selection & Details */}
        <View className="min-w-[350px] flex-1 flex-col">
          {/* Voucher Info Details (Dạng dòng kẻ đồng bộ) */}
          <View className="min-h-[180px] rounded-[24px] border border-dashed border-outline-variant bg-surface-100 p-6">
            {appliedVoucher ? (
              <>
                <Text className="mb-4 text-sm font-black uppercase tracking-widest text-surface-on">
                  Thông tin Voucher
                </Text>

                <View className="gap-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-surface-onVariant text-lg font-bold">Mức giảm giá</Text>
                    <Text className="text-xl font-black text-primary">
                      {appliedVoucher.percent}%
                    </Text>
                  </View>

                  {appliedVoucher.maxDiscountAmount && (
                    <View className="flex-row items-center justify-between">
                      <Text className="text-surface-onVariant text-lg font-bold">Giảm tối đa</Text>
                      <Text className="text-xl font-black text-surface-on">
                        {formatCurrency(appliedVoucher.maxDiscountAmount)}
                      </Text>
                    </View>
                  )}

                  <View className="flex-row items-center justify-between">
                    <Text className="text-surface-onVariant text-lg font-bold">
                      Phạm vi áp dụng
                    </Text>
                    <Text className="text-base font-black text-primary">
                      {appliedVoucher.applicableProductIds &&
                      appliedVoucher.applicableProductIds.length > 0
                        ? 'Sản phẩm chỉ định'
                        : 'Tất cả sản phẩm'}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          {/* Voucher Input Section */}
          <View className="mt-8">
            <Text className="mb-4 text-sm font-black uppercase tracking-widest text-surface-on">
              Mã giảm giá
            </Text>
            <View className="flex-row items-center gap-4">
              <View className="relative flex-1 justify-center">
                <View className="absolute left-5 z-10">
                  <Ticket size={24} color={COLORS.muted} />
                </View>
                <TextInput
                  className="py-4.5 rounded-[20px] border border-outline-variant bg-surface-100 pl-14 pr-6 text-xl font-black text-surface-on"
                  placeholder="Nhập mã..."
                  value={voucherInput}
                  onChangeText={setVoucherInput}
                  autoCapitalize="characters"
                  editable={!appliedVoucher && !isVerifying}
                />
              </View>
              {appliedVoucher ? (
                <IconButton
                  icon={XCircle}
                  size={36}
                  color={COLORS.error.default}
                  className="h-16 w-16 rounded-[20px] border border-error/30 bg-error/10"
                  onPress={handleRemoveVoucher}
                />
              ) : (
                <Button
                  label="Áp dụng"
                  className="h-16 min-w-[120px] rounded-[20px]"
                  textClassName="text-lg font-black"
                  onPress={handleApplyVoucher}
                  disabled={!voucherInput.trim() || isVerifying}
                  loading={isVerifying}
                />
              )}
            </View>
          </View>
        </View>

        {/* 2. Middle: Calculation Summary */}
        <View className="min-w-[400px] flex-1 flex-col justify-end gap-4 border-x border-dashed border-outline-variant px-10">
          <View className="flex-row items-center justify-between">
            <Text className="text-surface-onVariant text-xl font-bold" numberOfLines={1}>
              Tổng SL
            </Text>
            <Text className="text-2xl font-black text-surface-on" numberOfLines={1}>
              {totalQty}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-surface-onVariant text-xl font-bold" numberOfLines={1}>
              Tạm tính
            </Text>
            <Text className="text-2xl font-black text-surface-on" numberOfLines={1}>
              {formatCurrency(subtotal)}
            </Text>
          </View>
          <Pressable
            className="flex-row items-center justify-between"
            onPress={() => {
              // Handle discount edit
            }}
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-black text-primary" numberOfLines={1}>
                Giảm giá
              </Text>
              <PenSquare size={20} color={COLORS.primary.default} />
            </View>
            <Text className="text-2xl font-black text-primary" numberOfLines={1}>
              {formatCurrency(discount)}
            </Text>
          </Pressable>
          <View className="flex-row items-center justify-between">
            <Text className="text-surface-onVariant text-xl font-bold" numberOfLines={1}>
              Thuế
            </Text>
            <Text className="text-2xl font-black text-surface-on" numberOfLines={1}>
              {formatCurrency(tax)}
            </Text>
          </View>
        </View>

        {/* 3. Right: Total & Payment Actions */}
        <View className="min-w-[600px] flex-col justify-end">
          <View className="flex-row items-center">
            <Text className="mr-6 text-2xl font-black uppercase text-surface-on" numberOfLines={1}>
              Tổng thanh toán
            </Text>
            <Text
              className="flex-1 text-right text-[56px] font-black tracking-[-2px] text-primary"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(total)}
            </Text>
          </View>

          <View className="h-[96px] flex-row items-end gap-6">
            {PAYMENT_REGISTRY.map((method) => (
              <Button
                key={method.type}
                label={method.label}
                leftIcon={method.icon}
                iconSize={32}
                variant="outline"
                className="flex-1 rounded-[24px]"
                textClassName="text-xl font-black"
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
    </KeyboardStickyView>
  )
}
