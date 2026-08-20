import { LoadingIndicator } from '@/shared/components/ui/loading'
import { useAlertStore } from '@/shared/store'
import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Text } from 'react-native'

export const GlobalEasyLoading = () => {
  const isLoading = useAlertStore((s) => s.isLoading)
  const message = useAlertStore((s) => s.loadingMessage)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.92)).current

  useEffect(() => {
    if (isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      fadeAnim.setValue(0)
      scaleAnim.setValue(0.92)
    }
  }, [isLoading, fadeAnim, scaleAnim])

  if (!isLoading) return null

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        opacity: fadeAnim,
        zIndex: 99999,
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          maxWidth: 320,
        }}
      >
        <LoadingIndicator size="large" color="#FFFFFF" />

        {message ? (
          <Text
            style={{
              fontFamily: 'Manrope-Bold',
              fontSize: 15,
              lineHeight: 22,
              color: '#FFFFFF',
              textAlign: 'center',
              letterSpacing: -0.2,
              marginTop: 14,
            }}
            numberOfLines={2}
          >
            {message}
          </Text>
        ) : null}
      </Animated.View>
    </Animated.View>
  )
}
