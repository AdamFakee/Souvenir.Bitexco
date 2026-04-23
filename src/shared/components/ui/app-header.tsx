import { COLORS, LAYOUT } from '@/shared/constants'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { ChevronLeft, LucideIcon } from 'lucide-react-native'
import { isValidElement, ReactNode } from 'react'
import { Image, ImageSourcePropType, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Props for the AppHeader component.
 */
interface AppHeaderProps {
  /**
   * Title displayed in the center of the header.
   */
  title?: string
  /**
   * Visual variant of the header:
   * - 'gradient': Uses the primary gradient background (default).
   * - 'white': Uses a solid white background.
   */
  variant?: 'gradient' | 'white'
  /**
   * Custom handler for the left (back) button press.
   * If not provided, it defaults to `router.back()`.
   */
  onLeftPress?: () => void
  /**
   * Icon to display on the right side.
   * Can be:
   * - A LucideIcon component (e.g. `Home`).
   * - An image source object (e.g. `require('./icon.png')`).
   * - A ReactNode (e.g. `<Icon />`).
   */
  rightIcon?: LucideIcon | ImageSourcePropType | ReactNode
  /**
   * Handler for the right icon press.
   */
  onRightPress?: () => void
  /**
   * Whether to show the left (back) button.
   * Defaults to `true`.
   */
  showLeftButton?: boolean
  /**
   * Custom colors for the gradient variant.
   * Defaults to `COLORS.background.headerGradient`.
   */
  colors?: readonly [string, string, ...string[]]
  /**
   * Whether to show a bottom border.
   * Defaults to `false`.
   */
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
  variant = 'gradient',
  onLeftPress,
  rightIcon,
  onRightPress,
  showLeftButton = true,
  colors,
  showBorderBottom = false,
  borderBottomColor = COLORS.background.secondary,
}: AppHeaderProps) => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isGradient = variant === 'gradient'

  const defaultColors = [
    COLORS.background.headerGradient.start,
    COLORS.background.headerGradient.end,
  ] as const

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

  const textColor = isGradient ? 'text-white' : 'text-text-primary-red'
  const iconColor = isGradient ? COLORS.text.primary.white : COLORS.text.primary.red

  /**
   * Renders the right icon based on its type (Component, Element, or Image).
   */
  const renderRightIcon = () => {
    if (!rightIcon) return null

    // Case 1: React Element (e.g. <Icon />)
    if (isValidElement(rightIcon)) {
      return rightIcon
    }

    // Case 2: Lucide Icon Component (e.g. Home)
    if (typeof rightIcon === 'object') {
      const Icon = rightIcon as LucideIcon
      return <Icon size={24} color={iconColor} />
    }

    // Case 3: Image Source (e.g. require('./icon.png'))
    return (
      <Image
        source={rightIcon as ImageSourcePropType}
        className="h-6 w-6"
        style={{ tintColor: iconColor }}
        resizeMode="contain"
      />
    )
  }

  const Content = (
    <View
      className={'w-full flex-row items-center justify-between px-4'}
      style={{ paddingTop: insets.top, height: LAYOUT.headerHeight + insets.top / 2 }}
    >
      {/* Left Section: Back Button */}
      <View className="w-12 items-start">
        {showLeftButton && (
          <Pressable
            onPress={handleLeftPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <ChevronLeft size={30} color={iconColor} />
          </Pressable>
        )}
      </View>

      {/* Center Section: Title */}
      <View className="flex-1 items-center justify-center">
        {title && (
          <Text className={'text-center text-pageTitle ' + textColor} numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>

      {/* Right Section: Action Icon */}
      <View className="w-12 items-end">
        {rightIcon && (
          <Pressable
            onPress={onRightPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            {renderRightIcon()}
          </Pressable>
        )}
      </View>
    </View>
  )

  if (isGradient) {
    return (
      <LinearGradient
        colors={colors || defaultColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[showBorderBottom && { borderBottomWidth: 1, borderBottomColor }]}
      >
        {Content}
      </LinearGradient>
    )
  }

  return (
    <View
      style={[
        { backgroundColor: COLORS.background.white },
        showBorderBottom && { borderBottomWidth: 1, borderBottomColor },
      ]}
    >
      {Content}
    </View>
  )
}
