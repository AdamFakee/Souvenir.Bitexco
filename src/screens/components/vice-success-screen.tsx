import { COLORS } from '@/shared/constants'
import React, { memo, useEffect } from 'react'
import { Text, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { useViceStore } from '../vice-store'

function ViceSuccessScreen() {
  const { setCurrentScreen } = useViceStore()

  useEffect(() => {
    // Màn hình chờ 10s sau đó tự động quay lại màn hình home
    const timeout = setTimeout(() => {
      setCurrentScreen('Home')
    }, 10000)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View
      className="flex-1 items-center justify-center p-12"
      style={{ backgroundColor: COLORS.surface[50] }}
    >
      <View className="items-center justify-center">
        {/* SVG Success Icon */}
        <View className="mb-12">
          <Svg height="240" width="240" viewBox="0 0 100 100">
            <Circle
              cx="50"
              cy="50"
              r="48"
              fill={COLORS.primary.fixed}
              stroke={COLORS.primary.default}
              strokeWidth="1"
            />
            <Path
              d="M30 50L45 65L70 35"
              fill="none"
              stroke={COLORS.primary.default}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        {/* Success Message */}
        <Text
          className="mb-6 text-center font-sans text-6xl font-black uppercase tracking-tighter"
          style={{ color: COLORS.primary.default }}
        >
          Thanh toán thành công
        </Text>

        <Text
          className="text-center font-sans text-3xl font-medium"
          style={{ color: COLORS.surface.onVariant }}
        >
          Cảm ơn và hẹn gặp lại quý khách
        </Text>
      </View>
    </View>
  )
}

export default memo(ViceSuccessScreen)
