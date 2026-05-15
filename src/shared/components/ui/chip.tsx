import { cn } from '@/shared/utils'
import React from 'react'
import { Pressable, Text, View } from 'react-native'

interface ChipProps {
  label: string
  count?: number
  active?: boolean
  onPress?: () => void
  className?: string
  textClassName?: string
  disabled?: boolean
}

export const Chip = ({
  label,
  count,
  active = false,
  onPress,
  className,
  textClassName,
  disabled,
}: ChipProps) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        'flex-row items-center rounded-full border px-4 py-2 transition-all',
        active ? 'border-primary bg-primary' : 'border-outline-variant bg-surface-50',
        disabled && 'opacity-50',
        className,
      )}
    >
      <Text
        className={cn(
          'text-[13px] font-semibold',
          active ? 'text-primary-on' : 'text-surface-on-variant',
          textClassName,
        )}
        numberOfLines={1}
      >
        {label}
      </Text>
      {count !== undefined && (
        <View
          className={cn('ml-2 rounded-full px-2 py-0.5')}
          style={{
            backgroundColor: active ? 'rgba(255, 255, 255, 0.3)' : 'rgba(70, 69, 85, 0.15)',
          }}
        >
          <Text
            className={cn(
              'text-[11px] font-bold',
              active ? 'text-primary-on' : 'text-surface-on-variant',
            )}
          >
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  )
}
