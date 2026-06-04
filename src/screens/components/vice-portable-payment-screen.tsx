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
        <View className="w-[360px] items-center justify-center rounded-[24px] border border-white/20 bg-white p-5 shadow-sm">
          {/* Lottie Animation */}
          <LottieView
            source={portableLottieAnimation}
            autoPlay
            loop
            style={{ width: 160, height: 160 }}
          />

          <View className="mt-4 w-full rounded-2xl border border-outline-variant bg-white px-4 py-3">
            <Text className="text-center text-2xl font-bold uppercase tracking-wide text-muted">
              Tổng thanh toán
            </Text>
            <Text
              className="mt-1 text-center text-3xl font-black text-primary"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
            >
              {formatCurrency(total)}
            </Text>
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

export default memo(VicePortablePaymentScreen)
