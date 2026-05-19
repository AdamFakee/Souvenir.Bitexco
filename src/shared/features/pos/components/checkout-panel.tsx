import { Button, IconButton } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAuthStore } from '@/shared/features/auth'
import {
  calculateSubtotal,
  calculateTotalQuantity,
  calculateTotalTax,
  calculateVoucherDiscount,
  PAYMENT_REGISTRY,
  PaymentContext,
  PaymentPopupRef,
} from '@/shared/features/payment'
import { remoteVoucherApi } from '@/shared/features/payment/api/remote/voucher.remote.api'
import { PaymentMethod } from '@/shared/lib/database'
import { useConnectionStore } from '@/shared/store'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { useSelector } from '@xstate/react'
import { PenSquare, Ticket, XCircle } from 'lucide-react-native'
import React, { useMemo, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { KeyboardStickyView } from 'react-native-keyboard-controller'
import { useActiveCart, usePosActor } from '../hooks'
import { CartItem } from '../types/cart.types'

export default function CheckoutPanel() {
  const cartActor = useActiveCart()
  const { currentStaff, session } = useAuthStore()
  const isNetworkConnected = useConnectionStore((s) => s.isNetworkConnected)
  const isPosConnected = useConnectionStore((s) => s.isPosConnected)

  // Get data from Actor
  const items = useSelector(cartActor!, (s) => s?.context?.items || {})
  const activeSessionId = useSelector(cartActor!, (s) => s?.context?.id || null)
  const appliedVoucher = useSelector(cartActor!, (s) => s?.context?.appliedVoucher || null)

  const [voucherInput, setVoucherInput] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
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

  const handleCheckoutSuccess = () => {
    if (activeSessionId) {
      posActor?.send({ type: 'REMOVE_TAB', id: activeSessionId })
    }
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

    setIsVerifying(true)
    try {
      const response = await remoteVoucherApi.verify({
        code: voucherInput,
        subtotal,
      })
      cartActor?.send({ type: 'APPLY_VOUCHER', voucher: response })
      setVoucherInput(response.code)
      toast.success(`Đã áp dụng mã giảm giá: ${response.code}`)
    } catch (error: any) {
      toast.error(error.message || 'Mã giảm giá không hợp lệ')
    } finally {
      setIsVerifying(false)
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
            {PAYMENT_REGISTRY.map((method) => {
              // isAvailable check từ strategy (được truyền thực tế trạng thái offline/online)
              const isAvailable = method.isAvailable(paymentContext, !isNetworkConnected)
              return (
                <Button
                  key={method.type}
                  label={method.label}
                  leftIcon={method.icon}
                  iconSize={32}
                  variant="outline"
                  className="flex-1 rounded-[24px]"
                  textClassName="text-xl font-black"
                  onPress={() => handleStartPayment(String(method.type))}
                  // Disabled khi giỏ trống HOẶC strategy không available HOẶC POS không kết nối được HOẶC QRCode mất kết nối mạng
                  disabled={
                    cart.length === 0 ||
                    !isAvailable ||
                    (method.type === PaymentMethod.CARD && isPosConnected === false) ||
                    (method.type === PaymentMethod.BANK_TRANSFER && !isNetworkConnected)
                  }
                />
              )
            })}
          </View>
        </View>

        {/* Render Popups động từ Registry */}
        {PAYMENT_REGISTRY.map((method) => (
          <method.PopupComponent
            key={method.type}
            ref={(r) => {
              popupRefs.current[String(method.type)] = r
            }}
            total={total}
            discount={discount}
            appliedVoucher={appliedVoucher}
            items={cart}
            staffId={session?.staffId ?? ''}
            shiftId={session?.shiftId ?? ''}
            activeSessionId={activeSessionId}
            printRef={printRef}
            staffName={currentStaff?.fullname}
            onSuccess={handleCheckoutSuccess}
          />
        ))}
      </View>
    </KeyboardStickyView>
  )
}
