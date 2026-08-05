import { useAlertStore } from '@/shared/store'
import React from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

export const GlobalEasyLoading = () => {
  const isLoading = useAlertStore((s) => s.isLoading)
  const message = useAlertStore((s) => s.loadingMessage)

  if (!isLoading) return null

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.18)',
        zIndex: 9999,
      }}
    >
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          paddingVertical: 28,
          paddingHorizontal: 36,
          alignItems: 'center',
          gap: 14,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 12,
          minWidth: 140,
        }}
      >
        <ActivityIndicator size="large" color="#1C4E68" />
        {message ? (
          <Text
            style={{ fontFamily: 'Manrope-SemiBold', fontSize: 15, color: '#303036' }}
            numberOfLines={2}
          >
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
