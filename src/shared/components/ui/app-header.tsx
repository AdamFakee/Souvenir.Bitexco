import { COLORS, SHADOW } from '@/shared/constants'
import { cn } from '@/shared/utils'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { ChevronLeft, LucideIcon } from 'lucide-react-native'
import React, { ReactNode, isValidElement } from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { IconButton } from './icon-button'

/**
 * Props for the AppHeader component.
 */
interface AppHeaderProps {
  /**
   * Title displayed in the center of the header.
   */
  title?: string
  /**
   * Subtitle displayed below the title.
   */
  subtitle?: string
  /**
   * Visual variant of the header:
   * - 'gradient': Uses the primary gradient background (default).
   * - 'white': Uses a solid white background.
   */
  variant?: 'gradient' | 'white'
  /**
   * Node to display on the left side.
   * If provided, replaces the default back button.
   */
  leftIcon?: LucideIcon | ReactNode
  /**
   * Custom handler for the left button press.
   */
  onLeftPress?: () => void
  /**
   * Node to display on the right side.
   * Typically a Lucide icon component.
   */
  rightIcon?: LucideIcon | ReactNode
  /**
   * Handler for the right icon press.
   */
  onRightPress?: () => void
  /**
   * Whether to show the left button.
   * Defaults to `true`.
   */
  showLeftButton?: boolean
  /**
   * Whether to show a bottom border.
   * Defaults to `false`.
   */
  showBorderBottom?: boolean
  /**
   * Color of the bottom border.
   * Defaults to `COLORS.background.secondary`.
   */
  borderBottomColor?: string
}

/**
 * A reusable header component with support for Gradient and White variants.
 * Handles safe area, back navigation, and optional right actions.
 */
export const AppHeader = ({
  title,
  subtitle,
  variant = 'white',
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  showLeftButton = true,
  showBorderBottom = false,
  borderBottomColor = COLORS.surface[200],
}: AppHeaderProps) => {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const isGradient = variant === 'gradient'

  /**
   * Handles back navigation.
   * Checks for custom handler first, then falls back to router.back().
   */
  const handleLeftPress = () => {
    if (onLeftPress) {
      onLeftPress()
    } else {
      if (router.canGoBack()) {
        router.back()
      }
    }
  }

  const textColor = isGradient ? 'text-white' : 'text-secondary'
  const subTextColor = isGradient ? 'text-white/80' : 'text-on-surface-variant'
  const iconColor = isGradient ? '#ffffff' : COLORS.secondary.default

  const Content = (
    <View
      className={cn('w-full flex-row items-center justify-between px-4 pb-3')}
      style={{ paddingTop: insets.top, minHeight: 64 + insets.top }}
    >
      {/* Left Section: Back/Menu Button */}
      <View className="w-12 items-start">
        {(showLeftButton || leftIcon) && (
          <IconButton
            icon={
              !leftIcon ? ChevronLeft : !isValidElement(leftIcon) ? (leftIcon as any) : undefined
            }
            onPress={handleLeftPress}
            color={iconColor}
            variant="md"
            className={cn(!isGradient && 'bg-surface-100')}
          >
            {isValidElement(leftIcon) ? (leftIcon as ReactNode) : null}
          </IconButton>
        )}
      </View>

      {/* Center Section: Title & Subtitle */}
      <View className="flex-1 items-center justify-center py-1">
        {title && (
          <Text className={cn('text-center text-lg font-semibold', textColor)} numberOfLines={1}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text className={cn('mt-0.5 text-center text-[11px]', subTextColor)} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Section: Action Icon */}
      <View className="w-12 items-end">
        {rightIcon ? (
          <IconButton
            onPress={onRightPress}
            variant="md"
            color={iconColor}
            icon={!isValidElement(rightIcon) ? (rightIcon as any) : undefined}
          >
            {isValidElement(rightIcon) ? (rightIcon as ReactNode) : null}
          </IconButton>
        ) : (
          <View className="w-11" />
        )}
      </View>
    </View>
  )

  if (isGradient) {
    return (
      <LinearGradient
        colors={[COLORS.primary.default, COLORS.primary.container]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="w-full"
      >
        {Content}
      </LinearGradient>
    )
  }

  return (
    <View
      className="bg-white"
      style={[
        showBorderBottom && { borderBottomWidth: 1, borderBottomColor },
        !showBorderBottom && {
          ...SHADOW.default,
          elevation: 4, // Tweak elevation for cleaner look
          shadowOpacity: 0.08,
        },
      ]}
    >
      {Content}
    </View>
  )
}
