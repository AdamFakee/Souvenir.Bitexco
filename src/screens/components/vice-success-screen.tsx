import React, { memo, useEffect } from 'react'
import { Text, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { useViceStore } from '../vice-store'

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
        {/* SVG Checkmark tròn xanh lá nhẹ nhàng, tinh tế */}
        <View className="mb-6">
          <Svg height="120" width="120" viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="48" fill="#e6f4ea" stroke="#34a853" strokeWidth="1" />
            <Path
              d="M30 50L45 65L70 35"
              fill="none"
              stroke="#34a853"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
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
