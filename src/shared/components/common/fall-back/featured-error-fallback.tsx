import { COLORS } from '@/shared/constants'
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Home,
  RefreshCcw,
  Terminal,
} from 'lucide-react-native'
import React, { useState } from 'react'
import { type FallbackProps } from 'react-error-boundary'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '../../ui'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ErrorFallbackProps extends FallbackProps {
  /** Optional error code to display. Defaults to '500_INTERNAL' */
  errorCode?: string
  /** Called when the user taps the X / close button */
  onClose?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A premium React-Native error fallback screen using NativeWind.
 */
export function FeaturedErrorFallback({
  error,
  resetErrorBoundary,
  errorCode = '500_INTERNAL',
}: ErrorFallbackProps) {
  const insets = useSafeAreaInsets()
  const [showDetails, setShowDetails] = useState(false)
  const err = error instanceof Error ? error : new Error(String(error))

  return (
    <View className="flex-1 bg-surface-50" style={{ paddingTop: insets.top }}>
      {/* Ambient Glows */}
      <View
        className="absolute -left-20 -top-20 h-80 w-80 rounded-full opacity-[0.05]"
        style={{ backgroundColor: COLORS.primary.default }}
      />
      <View
        className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full opacity-[0.05]"
        style={{ backgroundColor: COLORS.tertiary.default }}
      />

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center">
          {/* Icon Cluster */}
          <View className="mb-8 h-24 w-24 items-center justify-center rounded-full bg-error-container">
            <AlertCircle size={48} color={COLORS.error.default} strokeWidth={2} />
          </View>

          <Text className="text-on-surface mb-2 text-center text-headline-md font-bold">
            Đã xảy ra lỗi hệ thống
          </Text>

          <Text className="text-on-surface-variant mb-6 text-center text-body-base">
            Ứng dụng gặp sự cố không mong muốn. Đừng lo lắng, dữ liệu của bạn đã được bảo vệ.
          </Text>

          <View className="mb-8 w-full flex-row items-center justify-center rounded-lg border border-outline-variant bg-surface-100 px-4 py-2">
            <Text className="text-on-surface-variant mr-2 text-label-caps">MÃ LỖI:</Text>
            <Text className="text-error-default text-body-sm font-semibold">{errorCode}</Text>
          </View>

          {/* Actions */}
          <View className="mb-6 w-full gap-3">
            <Button
              label="Thử lại ngay"
              variant="primary"
              leftIcon={RefreshCcw}
              onPress={resetErrorBoundary}
            />
            <Button
              label="Xem chi tiết lỗi"
              variant="outline"
              leftIcon={showDetails ? ChevronUp : ChevronDown}
              onPress={() => setShowDetails(!showDetails)}
            />
          </View>

          {/* Error Details (Expandable) */}
          {showDetails && (
            <View className="w-full rounded-xl border border-outline-variant bg-surface-200 p-4">
              <View className="mb-3 flex-row items-center gap-2">
                <Terminal size={18} color={COLORS.surface.onVariant} />
                <Text className="text-on-surface-variant text-label-caps">Stack Trace</Text>
              </View>

              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                <Text className="text-on-surface-variant font-mono text-body-sm">
                  {err.message}
                  {'\n\n'}
                  {err.stack}
                </Text>
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
