import { COLORS } from '@/shared/constants'
import { useAlertStore, Toast as ToastType } from '@/shared/store'
import { cn } from '@/shared/utils'
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react-native'
import React from 'react'
import { Text, View, Pressable } from 'react-native'
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    color: COLORS.success.default,
    bgColor: 'bg-success-container',
    borderColor: 'border-success',
  },
  error: {
    icon: AlertCircle,
    color: COLORS.error.default,
    bgColor: 'bg-error-container',
    borderColor: 'border-error',
  },
  warning: {
    icon: AlertTriangle,
    color: COLORS.warning.default,
    bgColor: 'bg-warning-container',
    borderColor: 'border-warning',
  },
  info: {
    icon: Info,
    color: COLORS.info.default,
    bgColor: 'bg-info-container',
    borderColor: 'border-info',
  },
}

const ToastItem = ({ toast }: { toast: ToastType }) => {
  const { hideToast } = useAlertStore()
  const config = TYPE_CONFIG[toast.type]
  const Icon = config.icon
  const textOnColor = `text-${toast.type}-on-container`

  return (
    <Animated.View
      entering={SlideInRight.duration(400)}
      exiting={SlideOutRight.duration(300)}
      className={cn(
        'mb-3 flex-row items-center overflow-hidden rounded-xl border p-4 shadow-sm',
        config.bgColor,
        config.borderColor,
      )}
      style={{ width: 340 }}
    >
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/40">
        <Icon size={24} color={config.color} strokeWidth={2.5} />
      </View>
      <View className="flex-1">
        <Text className={cn('text-body-base font-bold', textOnColor)} numberOfLines={1}>
          {toast.title}
        </Text>
        <Text className={cn('text-body-sm opacity-80', textOnColor)} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>
      <Pressable
        onPress={() => hideToast(toast.id)}
        className="ml-2 h-8 w-8 items-center justify-center rounded-full"
      >
        <X size={18} color={config.color} />
      </Pressable>
    </Animated.View>
  )
}

export const GlobalToast = () => {
  const insets = useSafeAreaInsets()
  const { toasts } = useAlertStore()

  if (toasts.length === 0) return null

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-6 z-[9999] items-end"
      style={{ top: insets.top + 12 }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  )
}
