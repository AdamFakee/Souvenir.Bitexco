import { COLORS } from '@/shared/constants'
import { cn } from '@/shared/utils'
import { LucideIcon } from 'lucide-react-native'
import React from 'react'
import { Pressable, PressableProps, ViewStyle, View, Text } from 'react-native'

/** Standard size configurations for IconButtons */
const SIZE_CONFIG = {
  sm: { container: 'w-8 h-8', icon: 16, hitSlop: 12 },
  md: { container: 'w-11 h-11', icon: 24, hitSlop: 10 },
  lg: { container: 'w-14 h-14', icon: 28, hitSlop: 8 },
  xl: { container: 'w-16 h-16', icon: 32, hitSlop: 6 },
}

export interface IconButtonProps extends Omit<PressableProps, 'style'> {
  /** The Lucide icon component to display (optional if children is provided) */
  icon?: LucideIcon
  /** Custom content to render inside the button (e.g. a pre-configured icon or badge) */
  children?: React.ReactNode
  /** Standard size presets (sm, md, lg, xl). Default: 'md' */
  variant?: keyof typeof SIZE_CONFIG
  /** Size of the icon (overrides variant preset if provided). Only applies if using 'icon' prop. */
  size?: number
  /** Color of the icon (default: primary color). Only applies if using 'icon' prop. */
  color?: string
  /** TailWind class names for the container */
  className?: string
  /** Custom styles for the container */
  style?: ViewStyle
}

/**
 * A reusable icon button component with standard size variants.
 * Supports both dedicated Lucide icon components and custom ReactNode children.
 * Automatically handles tap-target optimization (hitSlop).
 */
export const IconButton = ({
  icon: Icon,
  children,
  variant = 'md',
  size,
  color = COLORS.primary.default,
  className,
  style,
  hitSlop,
  ...props
}: IconButtonProps) => {
  const config = SIZE_CONFIG[variant] || SIZE_CONFIG.md

  return (
    <Pressable
      className={cn('items-center justify-center rounded-full', config.container, className)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, style]}
      hitSlop={hitSlop ?? config.hitSlop}
      {...props}
    >
      {Icon ? <Icon size={size ?? config.icon} color={color} strokeWidth={1.5} /> : children}
    </Pressable>
  )
}

export interface IconButtonWithBadgeProps extends IconButtonProps {
  badgeCount?: number
  containerClassName?: string
}

export const IconButtonWithBadge = ({
  badgeCount,
  containerClassName,
  ...props
}: IconButtonWithBadgeProps) => {
  return (
    <View className={cn('relative', containerClassName)}>
      <IconButton {...props} />
      {badgeCount !== undefined && badgeCount > 0 && (
        <View className="pointer-events-none absolute -right-1 -top-1 h-6 min-w-[24px] items-center justify-center rounded-full bg-error px-1.5 shadow-sm">
          <Text className="text-xs font-black text-white">{badgeCount}</Text>
        </View>
      )}
    </View>
  )
}
