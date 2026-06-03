import React from 'react'
import { Modal, View, Text } from 'react-native'
import { LoadingIndicator } from './loading'
import { GlobalToast } from './global-toast'

interface FullScreenLoadingProps {
  /** Whether the loading overlay is visible */
  visible: boolean
  /** Optional message to display below the spinner */
  message?: string
}

export const FullScreenLoading = ({ visible, message }: FullScreenLoadingProps) => {
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/40">
        <View className="items-center justify-center rounded-3xl bg-white p-8 shadow-2xl">
          <LoadingIndicator />
          {message && <Text className="text-on-surface mt-4 text-base font-medium">{message}</Text>}
        </View>
      </View>
      <GlobalToast />
    </Modal>
  )
}
