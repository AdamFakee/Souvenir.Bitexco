import { cn } from '@/shared/utils'
import React from 'react'
import { Modal, Pressable, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { GlobalToast } from './global-toast'

export interface ModalBaseProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  dismissible?: boolean
  size?: 'default' | '90%' | 'full'
}

export const ModalBase = ({
  visible,
  onClose,
  children,
  className,
  dismissible = true,
  size = 'default',
}: ModalBaseProps) => {
  const handleDismiss = () => {
    if (dismissible) {
      onClose()
    }
  }

  const sizeClasses = {
    default: 'relative w-full overflow-hidden rounded-md bg-surface-50 shadow-2xl',
    '90%': 'h-[90%] w-[90%] max-w-none overflow-hidden rounded-[32px] bg-[#f8fafc]',
    full: 'h-full w-full max-w-none rounded-none bg-[#f8fafc]',
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
          className={cn(sizeClasses[size], className)}
        >
          {children}
        </Animated.View>
      </View>
      <GlobalToast />
    </Modal>
  )
}

ModalBase.displayName = 'ModalBase'
export default ModalBase
