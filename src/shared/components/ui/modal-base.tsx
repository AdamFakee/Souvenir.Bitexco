import { cn } from '@/shared/utils'
import React from 'react'
import { Modal, Pressable, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export interface ModalBaseProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  dismissible?: boolean
}

export const ModalBase = ({
  visible,
  onClose,
  children,
  className,
  dismissible = true,
}: ModalBaseProps) => {
  const handleDismiss = () => {
    if (dismissible) {
      onClose()
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-0">
        <Pressable className="absolute inset-0" onPress={handleDismiss} />

        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          className={cn(
            'relative w-full overflow-hidden rounded-md bg-surface-50 shadow-2xl',
            className,
          )}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  )
}

ModalBase.displayName = 'ModalBase'
export default ModalBase
