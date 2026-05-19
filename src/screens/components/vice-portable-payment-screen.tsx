import LottieView from 'lottie-react-native'
import React, { memo } from 'react'
import { Text, View } from 'react-native'

const portableLottieAnimation = require('../../assets/animation/portable-payment-processing.json')

function VicePortablePaymentScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <View className="items-center justify-center gap-8 p-8">
        {/* Lottie Animation */}
        <LottieView
          source={portableLottieAnimation}
          autoPlay
          loop
          style={{ width: 350, height: 350 }}
        />

        {/* Title */}
        <Text className="text-center font-sans text-4xl font-black uppercase tracking-wider text-primary">
          Thanh toán qua thẻ POS
        </Text>
      </View>
    </View>
  )
}

export default memo(VicePortablePaymentScreen)
