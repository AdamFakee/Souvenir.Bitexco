import { cn } from '@/shared/utils'
import React from 'react'
import { Pressable, PressableProps, Text, View } from 'react-native'

export interface OptionCardProps extends PressableProps {
  text?: string
  children?: React.ReactNode
  isSelected?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  textClassName?: string
}

export const OptionCard: React.FC<OptionCardProps> = ({
  text,
  children,
  isSelected,
  onPress,
  disabled,
  className,
  textClassName,
  leftIcon,
  rightIcon,
  ...props
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        'mb-4 w-full flex-row items-center rounded-2xl border p-3',
        isSelected
          ? 'border-brand-primary bg-brand-primary/10'
          : 'border-gray-200 dark:border-gray-700',
        disabled && 'opacity-50',
        className,
      )}
      {...props}
      hitSlop={8}
    >
      {leftIcon && <View className="mr-3">{leftIcon}</View>}

      <View className="flex-1 justify-center">
        {children ? (
          children
        ) : (
          <Text
            className={cn(
              'text-lg',
              isSelected ? 'text-brand-primary font-medium' : 'text-gray-800 dark:text-gray-200',
              textClassName,
            )}
          >
            {text}
          </Text>
        )}
      </View>

      {rightIcon && <View className="ml-3">{rightIcon}</View>}
    </Pressable>
  )
}
