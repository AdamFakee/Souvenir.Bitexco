import { LogoSkystore } from '@/shared/components/ui'
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
          <LogoSkystore width={325} height={325} />
        </View>
      </ImageBackground>
    )
  }

  // 2. Màn hình giỏ hàng (Khi đang quét món) - Chỉ hiển thị Summary ở trung tâm
  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      <View className="flex-1 items-center justify-center p-4">
        <View className="w-[380px] rounded-2xl border border-slate-100 bg-white p-7 shadow-2xl">
          {(discount > 0 || tax > 0) && (
            <>
              <View className="flex-row items-center justify-between py-1.5">
                <Text style={styles.label}>Subtotal</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {formatCurrency(subtotal)}
                </Text>
              </View>

              {discount > 0 && (
                <View className="flex-row items-center justify-between py-1.5">
                  <Text style={styles.label}>Discount</Text>
                  <Text style={styles.discountValue} numberOfLines={1}>
                    -{formatCurrency(discount)}
                  </Text>
                </View>
              )}

              {tax > 0 && (
                <View className="flex-row items-center justify-between py-1.5">
                  <Text style={styles.label}>VAT</Text>
                  <Text style={styles.value} numberOfLines={1}>
                    {formatCurrency(tax)}
                  </Text>
                </View>
              )}

              <View className="my-3 h-px bg-slate-100" />
            </>
          )}

          <View className="flex-row items-center justify-between py-1.5">
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
    fontSize: 26,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 36,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  value: {
    flex: 1,
    fontSize: 26,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
    lineHeight: 36,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  discountValue: {
    flex: 1,
    fontSize: 26,
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'right',
    lineHeight: 36,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  totalLabel: {
    fontSize: 31,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 50,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  totalValue: {
    flex: 1,
    fontSize: 42,
    fontWeight: '800',
    color: '#ff5c00',
    textAlign: 'right',
    lineHeight: 50,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
})

const MemoizedViceHomeScreen = memo(ViceHomeScreen)
MemoizedViceHomeScreen.displayName = 'ViceHomeScreen'
export default MemoizedViceHomeScreen
