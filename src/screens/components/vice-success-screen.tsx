import { BG_MAIN } from '@/shared/features/auth'
import LottieView from 'lottie-react-native'
import React, { memo, useEffect } from 'react'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import { useViceStore } from '../vice-store'

const paymentSuccessLottie = require('../../assets/animation/payment-success.json')

function ViceSuccessScreen() {
  const { setCurrentScreen, clearCart } = useViceStore()

  useEffect(() => {
    // Clear cart and go to home screen after 5 seconds
    const timeout = setTimeout(() => {
      clearCart()
      setCurrentScreen('Home')
    }, 5000)

    return () => clearTimeout(timeout)
  }, [setCurrentScreen, clearCart])

  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      <View className="m-4 flex-1 items-center justify-center">
        {/* Khung Success Card căn giữa dạng gọn cho màn phụ */}
        <View className="w-[340px] items-center rounded-[24px] border border-white/20 bg-white p-6 shadow-xl">
          {/* Animated Lottie Checkmark */}
          <View className="mb-4">
            <LottieView
              source={paymentSuccessLottie}
              autoPlay
              loop={false}
              style={{ width: 140, height: 140 }}
            />
          </View>

          {/* Thông điệp thành công */}
          <Text className="text-center text-2xl font-black uppercase tracking-wider text-surface-on">
            Thanh toán thành công
          </Text>
          <Text className="mt-2 text-center text-lg font-semibold text-surface-on-variant">
            Cảm ơn và hẹn gặp lại quý khách!
          </Text>
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

export default memo(ViceSuccessScreen)
