import { COLORS } from '@/shared/constants/color.const'
import { AlertCircle, ArrowLeft, Home, RefreshCcw, WifiOff, X } from 'lucide-react-native'
import React from 'react'
import { type FallbackProps } from 'react-error-boundary'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, IconButton } from '../../ui'

interface ErrorFallbackProps extends FallbackProps {
  /** Optional error code to display. Defaults to '500_INTERNAL' */
  errorCode?: string
  /** Called when the user taps the X / close button */
  onClose?: () => void
  /** Called when the user taps the Home button */
  onGoHome?: () => void
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
  errorCode = 'ERR_SYSTEM_FAILURE',
  onClose,
  onGoHome,
}: ErrorFallbackProps) {
  const insets = useSafeAreaInsets()
  const err = error instanceof Error ? error : new Error(String(error))

  return (
    <View className="flex-1 bg-white">
      {/* Background Decorative Ambient Glows */}
      <View
        className="absolute -left-20 -top-20 h-80 w-80 rounded-full opacity-[0.08]"
        style={{
          backgroundColor: COLORS.primary.default,
          shadowRadius: 100,
          shadowOpacity: 1,
          elevation: 0,
        }}
      />
      <View
        className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full opacity-[0.05]"
        style={{
          backgroundColor: COLORS.tertiary.default,
          shadowRadius: 100,
          shadowOpacity: 1,
          elevation: 0,
        }}
      />

      {/* Top Navigation */}
      <View
        className="h-16 flex-row items-center justify-between px-6"
        style={{ marginTop: insets.top }}
      >
        <IconButton icon={ArrowLeft} onPress={onGoHome} className="active:bg-neutral-100" />

        <Text className="text-lg font-bold uppercase tracking-tighter text-secondary">
          Hệ thống
        </Text>

        <IconButton icon={X} onPress={onClose} className="active:bg-neutral-100" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center">
          {/* Error Icon Cluster */}
          <View className="relative mb-12 items-center justify-center">
            {/* Decorative rings (simulated with Views) */}
            <View className="absolute h-40 w-40 rounded-full border border-primary/10" />
            <View className="absolute h-32 w-32 rounded-full border border-primary/5" />

            <View className="h-24 w-24 items-center justify-center rounded-full border border-neutral-100 bg-neutral-50 shadow-sm">
              <WifiOff size={48} color={COLORS.primary.default} strokeWidth={1.5} />
            </View>

            <View className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-error p-2 shadow-lg">
              <AlertCircle size={16} color="white" />
            </View>
          </View>

          {/* Content */}
          <Text className="mb-4 text-center text-3xl font-extrabold tracking-tight text-secondary">
            Rất tiếc, đã có lỗi xảy ra
          </Text>

          <Text className="mb-10 px-4 text-center text-base leading-6 text-neutral-400">
            Hệ thống đang gặp sự cố kỹ thuật hoặc mất kết nối internet. Vui lòng kiểm tra lại đường
            truyền.
          </Text>

          {/* Actions */}
          <View className="mt-2 w-full gap-4">
            <Button
              label="Thử lại"
              variant="primary"
              leftIcon={RefreshCcw}
              onPress={resetErrorBoundary}
              className="h-14 shadow-lg shadow-primary/20"
            />

            <Button
              label="Quay về trang chủ"
              variant="secondary"
              leftIcon={Home}
              onPress={onGoHome}
              className="h-14"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
