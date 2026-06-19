import { LogoSkydeck } from '@/shared/components/ui'
import { BG_MAIN } from '@/shared/features/auth'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import { useViceStore } from '../vice-store'

function ViceHomeScreen() {
  const items = useViceStore((state) => state.items)
  const subtotal = useViceStore((state) => state.subtotal)
  const discount = useViceStore((state) => state.discount)
  const tax = useViceStore((state) => state.tax)
  const total = useViceStore((state) => state.total)

  // 1. Màn hình chờ (Khi không có giỏ hàng)
  if (items.length === 0) {
    return (
      <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
        <View style={styles.overlay} />
        <View className="h-full w-full items-center justify-center">
          <LogoSkydeck width={250} height={250} />
        </View>
      </ImageBackground>
    )
  }

  // 2. Màn hình giỏ hàng (Khi đang quét món) - Chỉ hiển thị Summary ở trung tâm
  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      <View className="flex-1 items-center justify-center p-4">
        <View className="w-[280px] gap-1 rounded-xl bg-white px-3 py-3">
          <View className="flex-row items-center justify-between">
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.value} numberOfLines={1}>
              {formatCurrency(subtotal)}
            </Text>
          </View>

          {discount > 0 && (
            <View className="flex-row items-center justify-between">
              <Text style={styles.label}>Discount</Text>
              <Text style={styles.discountValue} numberOfLines={1}>
                -{formatCurrency(discount)}
              </Text>
            </View>
          )}

          <View className="flex-row items-center justify-between">
            <Text style={styles.label}>VAT</Text>
            <Text style={styles.value} numberOfLines={1}>
              {formatCurrency(tax)}
            </Text>
          </View>

          <View className="h-px bg-slate-200" />

          <View className="flex-row items-center justify-between">
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue} numberOfLines={1}>
              {formatCurrency(total)}
            </Text>
          </View>
        </View>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(83, 123, 144, 0.75)',
  },
  label: {
    flex: 1,
    fontSize: 22,
    fontWeight: '500',
    color: '#64748b',
    includeFontPadding: false,
  },
  value: {
    fontSize: 22,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'right',
    includeFontPadding: false,
  },
  discountValue: {
    fontSize: 22,
    fontWeight: '500',
    color: '#10b981',
    textAlign: 'right',
    includeFontPadding: false,
  },
  totalLabel: {
    flex: 1,
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b',
    includeFontPadding: false,
  },
  totalValue: {
    fontSize: 34,
    fontWeight: '700',
    color: '#ff5c00',
    textAlign: 'right',
    includeFontPadding: false,
  },
})

const MemoizedViceHomeScreen = memo(ViceHomeScreen)
MemoizedViceHomeScreen.displayName = 'ViceHomeScreen'
export default MemoizedViceHomeScreen
