import { cn } from '@/shared/utils'
import React from 'react'
import { Pressable, Text, View } from 'react-native'

export interface SegmentedControlOption<T> {
  label: string
  value: T
}

interface SegmentedControlProps<T> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <View className={cn('flex-row rounded-md bg-slate-100', className)}>
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            className={cn(
              'flex-1 items-center justify-center rounded-md py-3',
              isActive ? 'bg-primary' : 'bg-transparent',
            )}
          >
            <Text
              className={cn(
                'text-base font-semibold',
                isActive ? 'font-bold text-white' : 'text-slate-500',
              )}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
