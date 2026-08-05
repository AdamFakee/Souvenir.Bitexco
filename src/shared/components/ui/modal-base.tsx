import { cn } from '@/shared/utils'
import React, { memo } from 'react'
import { Modal, Pressable, View } from 'react-native'
import { GlobalToast } from './global-toast'

export interface ModalBaseProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  dismissible?: boolean
  size?: 'default' | '90%' | 'full' | '80%'
}

const SIZE_CLASSES = {
  default: 'relative w-full overflow-hidden rounded-md bg-surface-50 shadow-2xl',
  '90%': 'h-[90%] w-[90%] max-w-none overflow-hidden rounded-[32px] bg-[#f8fafc]',
  full: 'h-full w-full max-w-none rounded-none bg-[#f8fafc]',
  '80%': 'h-[80%] w-[80%] max-w-none overflow-hidden rounded-[32px] bg-[#f8fafc]',
} as const

/**
 * Native Modal fade only — bỏ Reanimated FadeIn 300ms chồng animation.
 * Mở modal cảm giác snappy hơn trên tablet.
 */
export const ModalBase = memo(function ModalBase({
  visible,
  onClose,
  children,
  className,
  dismissible = true,
  size = 'default',
}: ModalBaseProps) {
  const handleDismiss = () => {
    if (dismissible) onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View className="flex-1 items-center justify-center bg-black/50 px-0">
        <Pressable className="absolute inset-0" onPress={handleDismiss} />
        <View className={cn(SIZE_CLASSES[size], className)}>{children}</View>
      </View>
      <GlobalToast />
    </Modal>
  )
})

export default ModalBase
