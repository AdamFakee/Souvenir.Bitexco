import { Button, IconButton } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAppContext } from '@/shared/features/app'
import {
  calculateSubtotal,
  calculateTotalQuantity,
  calculateTotalTax,
  calculateVoucherDiscount,
  PAYMENT_REGISTRY,
  PaymentContext,
  PaymentPopupRef,
  useApplyVoucher,
} from '@/shared/features/payment'
import { PaymentMethod } from '@/shared/lib/database'
import { useConnectionStore } from '@/shared/store'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from '@xstate/react'
import { PenSquare, Ticket, XCircle } from 'lucide-react-native'
import React, { useMemo, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { KeyboardStickyView } from 'react-native-keyboard-controller'
import { useActiveCart, usePosActor } from '../hooks'
import { CartItem } from '../types/cart.types'

export default function CheckoutPanel() {
  const cartActor = useActiveCart()
  const { employee, cashSessionId, paymentMethods } = useAppContext()
  const isNetworkConnected = useConnectionStore((s) => s.isNetworkConnected)
  const isPosConnected = useConnectionStore((s) => s.isPosConnected)

  // Lọc và ánh xạ động các nút thanh toán từ XState context.paymentMethods
  const activeStrategies = useMemo(() => {
    let list = []
    if (!paymentMethods || paymentMethods.length === 0) {
      list = [...PAYMENT_REGISTRY]
    } else {
      list = paymentMethods
        .filter((method) => method.enabled)
        .map((method) => {
          // Ánh xạ API code -> PaymentMethod enum
          let mappedType = PaymentMethod.CASH
          if (method.code === 'qr_bidv') {
            mappedType = PaymentMethod.BANK_TRANSFER
          } else if (method.code === 'card_bidv') {
            mappedType = PaymentMethod.CARD
          }

          // Tìm strategy tương ứng trong registry gốc
          const originalStrategy = PAYMENT_REGISTRY.find((s) => s.type === mappedType)
          if (!originalStrategy) return null

          // Trả về strategy được tùy chỉnh nhãn và cấu hình hiển thị động
          return {
            ...originalStrategy,
            label: method.name, // Đổi tên nút theo cấu hình API động!
            displayOrder: method.displayOrder || 99,
          }
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)
    }

    // Luôn luôn thêm MixStrategy nếu chưa có trong danh sách
    const hasMix = list.some((s) => s.type === PaymentMethod.MIX)
    if (!hasMix) {
      const mixStrategy = PAYMENT_REGISTRY.find((s) => s.type === PaymentMethod.MIX)
      if (mixStrategy) {
        list.push({
          ...mixStrategy,
          displayOrder: 100, // Đặt ở cuối
        })
      }
    }

    return list.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99))
  }, [paymentMethods])

  // Phân bổ tối đa 2 nút trên 1 dòng để tự động full width nút thứ 3
  const chunkedStrategies = useMemo(() => {
    const chunks = []
    for (let i = 0; i < activeStrategies.length; i += 2) {
      chunks.push(activeStrategies.slice(i, i + 2))
    }
    return chunks
  }, [activeStrategies])

  // Get data from Actor
  const items = useSelector(cartActor!, (s) => s?.context?.items || {})
  const activeSessionId = useSelector(cartActor!, (s) => s?.context?.id || null)
  const appliedVoucher = useSelector(cartActor!, (s) => s?.context?.appliedVoucher || null)

  const [voucherInput, setVoucherInput] = useState('')
  const applyVoucherMutation = useApplyVoucher()
  const isVerifying = applyVoucherMutation.isPending
  const printRef = useRef(null)

  // Refs cho từng popup — key là PaymentMethod type
  const popupRefs = useRef<Record<string, PaymentPopupRef | null>>({})

  const cart = useMemo(() => {
    return Object.values(items) as CartItem[]
  }, [items])

  const subtotal = useMemo(() => calculateSubtotal(cart), [cart])

  const totalQty = useMemo(() => calculateTotalQuantity(cart), [cart])

  const discount = useMemo(() => {
    return calculateVoucherDiscount(cart, appliedVoucher)
  }, [cart, appliedVoucher])

  const tax = useMemo(() => calculateTotalTax(cart), [cart])

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

  const posActor = usePosActor()
  const queryClient = useQueryClient()

  const handleCheckoutSuccess = () => {
    if (activeSessionId) {
      posActor?.send({ type: 'REMOVE_TAB', id: activeSessionId })
    }
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    toast.success('Thanh toán thành công!')
  }

  /** Mở popup tương ứng với phương thức thanh toán */
  const handleStartPayment = (methodType: string) => {
    const popupRef = popupRefs.current[methodType]
    if (popupRef) {
      popupRef.open()
    } else {
      toast.error('Phương thức thanh toán này chưa được hỗ trợ')
    }
  }

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return

    try {
      const response = await applyVoucherMutation.mutateAsync({
        code: voucherInput,
      })
      cartActor?.send({ type: 'APPLY_VOUCHER', voucher: response })
      setVoucherInput(response.code)
      toast.success(`Đã áp dụng mã giảm giá: ${response.code}`)
    } catch (error: any) {
      toast.error(error.message || 'Mã giảm giá không hợp lệ')
    }
  }

  const handleRemoveVoucher = () => {
    cartActor?.send({ type: 'REMOVE_VOUCHER' })
    toast.info(' Đã gỡ mã giảm giá')
  }

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
      <View className="z-10 flex-row items-stretch gap-10 border-t border-outline-variant bg-surface-50 px-8 py-6 shadow-lg shadow-black/10">
        {/* 1. Left: Voucher Selection & Details */}
        <View className="min-w-[350px] flex-1 flex-col">
          {/* Voucher Info Details */}
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
                      <Text className="text-xl font-black text-surface-on" numberOfLines={1}>
                        {formatCurrency(appliedVoucher.maxDiscountAmount)}
                      </Text>
                    </View>
                  )}

                  <View className="flex-row items-center justify-between">
                    <Text className="text-surface-onVariant text-lg font-bold">
                      Phạm vi áp dụng
                    </Text>
                    <Text className="text-base font-black text-primary">
                      {appliedVoucher.applicableVariantIds &&
                      appliedVoucher.applicableVariantIds.length > 0
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

          <View className="mt-6 flex-col gap-4">
            {chunkedStrategies.map((chunk, rowIndex) => (
              <View key={rowIndex} className="h-[72px] flex-row gap-4">
                {chunk.map((method) => {
                  const isAvailable = method.isAvailable(paymentContext, !isNetworkConnected)
                  return (
                    <Button
                      key={method.type}
                      label={method.label}
                      leftIcon={method.icon}
                      iconSize={32}
                      variant="primary"
                      className="flex-1 rounded-[24px]"
                      // textClassName="text-xl font-black"
                      onPress={() => handleStartPayment(String(method.type))}
                      disabled={
                        cart.length === 0 ||
                        !isAvailable ||
                        (method.type === PaymentMethod.BANK_TRANSFER && !isNetworkConnected)
                      }
                    />
                  )
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Render Popups động từ Registry */}
        {activeStrategies.map((method) => (
          <method.PopupComponent
            key={method.type}
            ref={(r) => {
              popupRefs.current[String(method.type)] = r
            }}
            total={total}
            discount={discount}
            appliedVoucher={appliedVoucher}
            items={cart}
            staffId={employee?.id ?? ''}
            shiftId={cashSessionId ?? ''}
            activeSessionId={activeSessionId}
            printRef={printRef}
            staffName={employee?.displayName}
            onSuccess={handleCheckoutSuccess}
          />
        ))}
      </View>
    </KeyboardStickyView>
  )
}
