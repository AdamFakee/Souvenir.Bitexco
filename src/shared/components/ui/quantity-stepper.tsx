import { COLORS } from '@/shared/constants'
import { Minus, Plus } from 'lucide-react-native'
import React, { memo } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  min?: number
  max?: number
  editable?: boolean
  size?: 'sm' | 'md'
}

export const QuantityStepper = memo(function QuantityStepper({
  value,
  onChange,
  disabled = false,
  min = 0,
  max,
  editable = false,
  size = 'md',
}: QuantityStepperProps) {
  const buttonClassName =
    size === 'sm'
      ? 'h-10 w-10 items-center justify-center rounded-xl bg-surface-100'
      : 'h-11 w-11 items-center justify-center rounded-xl bg-surface-100'
  const inputClassName = 'w-8 text-center text-xl font-black text-surface-on'
  const iconSize = size === 'sm' ? 20 : 22
  const canDecrease = !disabled && value > min
  const canIncrease = !disabled && (max === undefined || value < max)

  return (
    <View className="flex-row items-center justify-center gap-2">
      <Pressable
        className={buttonClassName}
        onPress={() => onChange(value - 1)}
        disabled={!canDecrease}
      >
        <Minus size={iconSize} color={COLORS.surface.on} strokeWidth={4} />
      </Pressable>

      {editable ? (
        <TextInput
          value={value > 0 ? String(value) : ''}
          onChangeText={(text) => onChange(Number(text || 0))}
          keyboardType="number-pad"
          editable={!disabled}
          placeholder="0"
          className={inputClassName}
          placeholderTextColor={COLORS.muted}
        />
      ) : (
        <Text className={inputClassName}>{value}</Text>
      )}

      <Pressable
        className={buttonClassName}
        onPress={() => onChange(value + 1)}
        disabled={!canIncrease}
      >
        <Plus size={iconSize} color={COLORS.surface.on} strokeWidth={4} />
      </Pressable>
    </View>
  )
})
