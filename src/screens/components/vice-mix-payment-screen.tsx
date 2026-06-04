import { COLORS } from '@/shared/constants'
import { BG_MAIN } from '@/shared/features/auth'
import { formatCurrency } from '@/shared/utils'
import { WalletCards } from 'lucide-react-native'
import React, { memo } from 'react'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import { useViceStore } from '../vice-store'

const CashCard = memo(function CashCard({
  label,
  value,
  isHighlight = false,
}: {
  label: string
  value: number
  isHighlight?: boolean
}) {
  return (
    <View
      className={`flex-1 rounded-2xl border bg-white px-4 py-3 ${
        isHighlight ? 'border-primary/20' : 'border-outline-variant'
      }`}
    >
      <Text
        className="text-center text-2xl font-bold uppercase tracking-wide text-muted"
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        className={`mt-1 text-center text-3xl font-black ${
          isHighlight ? 'text-primary' : 'text-surface-on'
        }`}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
      >
        {formatCurrency(value)}
      </Text>
    </View>
  )
})

const Row = memo(function Row({
  label,
  value,
  isHighlight = false,
  prefix = '',
}: {
  label: string
  value: number
  isHighlight?: boolean
  prefix?: string
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-outline-variant pb-3">
      <Text className="text-3xl font-bold text-muted">{label}</Text>
      <Text
        className={`ml-4 flex-1 text-right text-3xl font-black ${
          isHighlight ? 'text-primary' : 'text-surface-on'
        }`}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {prefix}
        {formatCurrency(value)}
      </Text>
    </View>
  )
})

function ViceMixPaymentScreen() {
  const subtotal = useViceStore((state) => state.subtotal)
  const discount = useViceStore((state) => state.discount)
  const tax = useViceStore((state) => state.tax)
  const total = useViceStore((state) => state.total)
  const cashPaid = useViceStore((state) => state.cashPaid)
  const nonCashAmount = useViceStore((state) => state.nonCashAmount)

  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      <View className="m-4 flex-1 overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-xl">
        <View className="flex-row items-center justify-between border-b border-outline-variant bg-white px-6 py-4">
          <View className="flex-1 pr-4">
            <Text className="text-4xl font-black tracking-tight text-surface-on">
              Thanh toán kết hợp
            </Text>
          </View>

          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <WalletCards size={28} color={COLORS.primary.default} />
          </View>
        </View>

        <View className="flex-1 justify-between bg-surface-50 p-5">
          <View className="flex-row gap-3">
            <CashCard label="Tổng hóa đơn" value={total} />
            <CashCard label="Tiền mặt đã trả" value={cashPaid} />
            <CashCard label="Thẻ/QR còn lại" value={nonCashAmount} isHighlight />
          </View>

          <View className="rounded-[20px] border border-outline-variant bg-white p-5">
            <View className="mb-4">
              <Text className="text-3xl font-black uppercase tracking-wide text-surface-on">
                Chi tiết hóa đơn
              </Text>
            </View>
            <View className="gap-3">
              <Row label="Tạm tính" value={subtotal} />
              {discount > 0 && <Row label="Giảm giá" value={discount} prefix="-" isHighlight />}
              <Row label="Thuế" value={tax} />
            </View>
          </View>
        </View>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(83, 123, 144, 0.75)',
  },
})

export default memo(ViceMixPaymentScreen)
