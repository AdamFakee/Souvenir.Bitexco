import { COLORS } from '@/shared/constants'
import { Minus, Plus } from 'lucide-react-native'
import React, { memo, useCallback, useEffect, useState } from 'react'
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
  const [inputValue, setInputValue] = useState(String(value))

  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  const handleChangeText = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '')
      setInputValue(cleaned)

      if (cleaned === '') {
        return
      }

      const num = Number(cleaned)
      if (isNaN(num)) return

      const clampedNum = max !== undefined ? Math.min(num, max) : num

      if (clampedNum >= min && clampedNum !== value) {
        onChange(clampedNum)
      }
    },
    [max, min, value, onChange],
  )

  const handleBlur = useCallback(() => {
    const num = Number(inputValue)
    if (inputValue === '' || isNaN(num) || num < min) {
      setInputValue(String(value))
    }
  }, [inputValue, min, value])

  const getButtonClass = (isEnabled: boolean) => {
    const base =
      size === 'sm'
        ? 'h-10 w-10 items-center justify-center rounded-xl'
        : 'h-11 w-11 items-center justify-center rounded-xl'
    return `${base} ${isEnabled ? 'bg-surface-100 active:bg-surface-200' : 'bg-surface-50'}`
  }
  const inputClassName = 'w-8 text-center text-xl font-black text-surface-on'
  const iconSize = size === 'sm' ? 20 : 22
  const canDecrease = !disabled && value > min
  const canIncrease = !disabled && (max === undefined || value < max)

  return (
    <View className="flex-row items-center justify-center gap-2">
      <Pressable
        className={getButtonClass(canDecrease)}
        style={!canDecrease ? { opacity: 0.4 } : undefined}
        onPress={() => onChange(value - 1)}
        disabled={!canDecrease}
      >
        <Minus
          size={iconSize}
          color={canDecrease ? COLORS.surface.on : COLORS.neutral[300]}
          strokeWidth={4}
        />
      </Pressable>

      {editable ? (
        <TextInput
          value={inputValue}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          onSubmitEditing={handleBlur}
          keyboardType="number-pad"
          editable={!disabled}
          className={inputClassName}
          placeholderTextColor={COLORS.muted}
        />
      ) : (
        <Text className={inputClassName}>{value}</Text>
      )}

      <Pressable
        className={getButtonClass(canIncrease)}
        style={!canIncrease ? { opacity: 0.4 } : undefined}
        onPress={() => onChange(value + 1)}
        disabled={!canIncrease}
      >
        <Plus
          size={iconSize}
          color={canIncrease ? COLORS.surface.on : COLORS.neutral[300]}
          strokeWidth={4}
        />
      </Pressable>
    </View>
  )
})
