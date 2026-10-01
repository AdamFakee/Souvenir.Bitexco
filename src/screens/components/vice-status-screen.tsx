import { IMAGES } from '@/shared/constants'
import React, { memo } from 'react'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

export type StatusType = 'info' | 'error' | 'success'

interface ViceStatusScreenProps {
  type?: StatusType
  title?: string
  message?: string
}

function ViceStatusScreen({
  type = 'info',
  title = 'Thông báo',
  message = '',
}: ViceStatusScreenProps) {
  const renderIcon = () => {
    switch (type) {
      case 'error':
        return (
          <Svg width={146} height={146} viewBox="0 0 100 100" fill="none">
            <Circle cx="50" cy="50" r="50" fill="#EF4444" />
            <Path
              d="M32 32L68 68M68 32L32 68"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )
      case 'success':
        return (
          <Svg width={146} height={146} viewBox="0 0 100 100" fill="none">
            <Circle cx="50" cy="50" r="50" fill="#22C55E" />
            <Path
              d="M30 52L44 66L70 34"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )
      case 'info':
      default:
        return (
          <Svg width={146} height={146} viewBox="0 0 100 100" fill="none">
            <Circle cx="50" cy="50" r="50" fill="#3B82F6" />
            <Circle cx="50" cy="32" r="6" fill="white" />
            <Path d="M50 46V72" stroke="white" strokeWidth="8" strokeLinecap="round" />
          </Svg>
        )
    }
  }

  return (
    <ImageBackground source={IMAGES.BG_MAIN} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />

      <View className="m-4 flex-1 items-center justify-center">
        <View className="w-[440px] items-center rounded-2xl border border-slate-100 bg-white px-10 py-12 shadow-2xl">
          {/* Status Icon */}
          {renderIcon()}

          {/* Title */}
          {!!title && (
            <Text className="mt-10 text-center text-[48px] font-extrabold leading-[56px] tracking-tight text-slate-900">
              {title}
            </Text>
          )}

          {/* Message */}
          {!!message && (
            <Text className="mt-4 text-center text-[32px] font-semibold leading-[40px] text-slate-600">
              {message}
            </Text>
          )}
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

export default memo(ViceStatusScreen)
