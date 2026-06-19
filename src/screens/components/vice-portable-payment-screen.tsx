import { BG_MAIN } from '@/shared/features/auth'
import { formatCurrency } from '@/shared/utils'
import LottieView from 'lottie-react-native'
import React, { memo } from 'react'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import { useViceStore } from '../vice-store'

const portableLottieAnimation = require('../../assets/animation/portable-payment-processing.json')

function VicePortablePaymentScreen() {
  const total = useViceStore((state) => state.total)

  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      <View className="flex-1 items-center justify-center p-4">
        <View className="w-[280px] gap-2 rounded-xl bg-white px-3 py-3">
          {/* Lottie Animation */}
          <View className="w-full items-center justify-center py-1">
            <LottieView
              source={portableLottieAnimation}
              autoPlay
              loop
              style={{ width: 140, height: 140 }}
            />
          </View>

          <View className="h-px w-full bg-slate-200" />

          {/* Amount info */}
          <View className="w-full flex-row items-center justify-center">
            <Text style={styles.totalLabel}>
              Total: <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
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
  totalLabel: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b',
    includeFontPadding: false,
    textAlign: 'center',
  },
  totalValue: {
    fontSize: 34,
    fontWeight: '700',
    color: '#ff5c00',
    includeFontPadding: false,
  },
})

export default memo(VicePortablePaymentScreen)
