import LottieView from 'lottie-react-native'
import React, { memo, useEffect } from 'react'
import { Text, View } from 'react-native'
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
    <View className="flex-1 items-center justify-center bg-white p-6">
      {/* Khung Success Card căn giữa dạng Dọc siêu sang trọng */}
      <View
        style={{ width: 360 }}
        className="items-center rounded-[28px] border border-surface-200 bg-white p-8 shadow-xl"
      >
        {/* Animated Lottie Checkmark siêu đẹp, sinh động */}
        <View className="mb-6">
          <LottieView
            source={paymentSuccessLottie}
            autoPlay
            loop={false}
            style={{ width: 180, height: 180 }}
          />
        </View>

        {/* Thông điệp thành công */}
        <Text className="text-center font-sans text-2xl font-black uppercase tracking-wider text-surface-on">
          Thanh toán thành công
        </Text>
        <Text className="mt-2 text-center font-sans text-xl font-semibold text-surface-on-variant">
          Cảm ơn và hẹn gặp lại quý khách!
        </Text>
      </View>
    </View>
  )
}

export default memo(ViceSuccessScreen)
