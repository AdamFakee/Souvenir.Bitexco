import { IMAGES } from '@/shared/constants'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import { useViceStore } from '../vice-store'

export const ViceMixPaymentScreen = memo(function ViceMixPaymentScreen() {
  const total = useViceStore((state) => state.total)
  const cashPaid = useViceStore((state) => state.cashPaid)
  const nonCashAmount = useViceStore((state) => state.nonCashAmount)

  return (
    <ImageBackground source={IMAGES.BG_MAIN} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      <View className="flex-1 items-center justify-center p-4">
        <View className="w-[380px] rounded-2xl border border-slate-100 bg-white p-7 shadow-2xl">
          <View className="flex-row items-center justify-between py-1.5">
            <Text style={styles.label}>Total</Text>
            <Text style={styles.value} numberOfLines={1}>
              {formatCurrency(total)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1.5">
            <Text style={styles.label}>Cash</Text>
            <Text style={styles.cashValue} numberOfLines={1}>
              {formatCurrency(cashPaid)}
            </Text>
          </View>

          <View className="my-3 h-px bg-slate-100" />

          <View className="flex-row items-center justify-between py-1.5">
            <Text style={styles.totalLabel} numberOfLines={1}>
              Card / QR
            </Text>
            <Text style={styles.totalValue} numberOfLines={1}>
              {formatCurrency(nonCashAmount)}
            </Text>
          </View>
        </View>
      </View>
    </ImageBackground>
  )
})

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
  cashValue: {
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

export default memo(ViceMixPaymentScreen)
