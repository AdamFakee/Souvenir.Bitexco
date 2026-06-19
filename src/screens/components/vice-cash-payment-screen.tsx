import { BG_MAIN } from '@/shared/features/auth'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import { useViceStore } from '../vice-store'

function ViceCashPaymentScreen() {
  const total = useViceStore((state) => state.total)
  const customerPaid = useViceStore((state) => state.customerPaid)
  const change = useViceStore((state) => state.change)

  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      <View className="flex-1 items-center justify-center p-4">
        <View className="w-[280px] gap-1 rounded-xl bg-white px-3 py-3">
          <View className="flex-row items-center justify-between">
            <Text style={styles.label}>Total</Text>
            <Text style={styles.value} numberOfLines={1}>
              {formatCurrency(total)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text style={styles.label}>Cash Tendered</Text>
            <Text style={styles.cashValue} numberOfLines={1}>
              {formatCurrency(customerPaid)}
            </Text>
          </View>

          <View className="h-px bg-slate-200" />

          <View className="flex-row items-center justify-between">
            <Text style={styles.totalLabel}>Change Due</Text>
            <Text style={styles.totalValue} numberOfLines={1}>
              {formatCurrency(change)}
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
  cashValue: {
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

export default memo(ViceCashPaymentScreen)
