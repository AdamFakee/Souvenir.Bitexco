import { Button } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAuthStore } from '@/shared/features/auth'
import {
  CashPaymentPopup,
  CashPaymentPopupRef,
  QrPaymentPopup,
  QrPaymentPopupRef,
} from '@/shared/features/payment'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { Banknote, CreditCard, QrCode, Trash2 } from 'lucide-react-native'
import React, { useMemo, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useCartStore } from '../store'

export default function CheckoutPanel() {
  const { sessions, activeSessionId, removeCurrentCart } = useCartStore()

  const { isOfflineMode } = useAuthStore()
  const cashPopupRef = useRef<CashPaymentPopupRef>(null)
  const qrPopupRef = useRef<QrPaymentPopupRef>(null)

  const handleCashCheckout = () => {
    toast.success(`Thanh toán thành công!`)
    removeCurrentCart()
  }

  const handleQrCheckout = () => {
    toast.success(`Thanh toán thành công!`)
    removeCurrentCart()
  }

  const handleCardCheckout = () => {
    toast.success(`Thanh toán thành công!`)
    removeCurrentCart()
  }

  const activeSession = activeSessionId ? sessions[activeSessionId] : null
  const cart = useMemo(() => {
    return activeSession ? Object.values(activeSession.items) : []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.items])
  const discount = activeSession?.discount || 0

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  }, [cart])

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount)
  }, [subtotal, discount])

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

          <View className="mb-8 flex-row justify-between">
            <Text className="text-title-sm font-semibold text-primary">Giảm giá (-):</Text>
            <Text className="text-title-sm font-bold text-primary">
              {discount > 0 ? `-${formatCurrency(discount)}` : '0 đ'}
            </Text>
          </View>

          <View className="mb-10 flex-row items-center justify-between border-t border-outline-variant pt-8">
            <Text className="text-headline-md font-extrabold text-surface-on">Tổng tiền:</Text>
            <Text className="text-display-sm font-black text-primary">{formatCurrency(total)}</Text>
          </View>

          {/* Voucher Input Area */}
          <View className="mt-2 border-t border-dashed border-outline-variant pt-8">
            <Text className="mb-4 text-xs font-black uppercase tracking-widest text-surface-on-variant">
              Mã giảm giá / Voucher
            </Text>
            <Pressable
              className="flex-row items-center justify-between rounded-2xl border border-outline-variant bg-surface-100 p-5 active:bg-surface-200"
              onPress={() => toast.info('Tính năng đang phát triển')}
            >
              <View className="flex-row items-center">
                <View className="rounded-xl bg-primary/10 p-3">
                  <CreditCard size={22} color={COLORS.primary.default} />
                </View>
                <Text className="ml-4 text-body-base font-semibold text-surface-on-variant">
                  Nhập mã hoặc chọn ưu đãi...
                </Text>
              </View>
            </Pressable>
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
            disabled={cart.length === 0}
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
          <Button
            label="Tiền mặt"
            variant="primary"
            leftIcon={Banknote}
            className="h-24 flex-1 rounded-2xl"
            textClassName="text-title-md"
            iconSize={28}
            disabled={cart.length === 0}
            onPress={() => cashPopupRef.current?.open()}
          />
        </View>

        <View className="flex-row gap-3">
          <Button
            label="QRCode"
            variant="outline"
            leftIcon={QrCode}
            className="h-20 flex-1 rounded-2xl"
            disabled={cart.length === 0 || isOfflineMode}
            onPress={() => qrPopupRef.current?.open()}
          />
          <Button
            label="Thẻ"
            variant="outline"
            leftIcon={CreditCard}
            className="h-20 flex-1 rounded-2xl"
            disabled={cart.length === 0}
            onPress={handleCardCheckout}
          />
        </View>
      </View>

      <CashPaymentPopup ref={cashPopupRef} total={total} onCheckout={handleCashCheckout} />

      <QrPaymentPopup
        ref={qrPopupRef}
        total={total}
        activeSessionId={activeSessionId}
        onCheckout={handleQrCheckout}
      />
    </View>
  )
}
