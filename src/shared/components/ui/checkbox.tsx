import { cn } from '@/shared/utils'
import { Check } from 'lucide-react-native'
import React, { memo } from 'react'
import { Pressable, PressableProps } from 'react-native'

interface CheckboxProps extends Omit<PressableProps, 'style'> {
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export const Checkbox = memo(function Checkbox({
  checked,
  onChange,
  disabled = false,
  className,
  size = 'md',
  ...props
}: CheckboxProps) {
  const containerSizeClass = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-12 w-12 rounded-xl'
  const checkIconSize = size === 'sm' ? 18 : 26

  return (
    <Pressable
      className={cn(
        'items-center justify-center border-2',
        containerSizeClass,
        checked ? 'border-primary bg-primary' : 'border-outline-variant bg-white',
        disabled && 'opacity-50',
        className,
      )}
      onPress={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: pressed && !disabled ? 0.7 : 1 })}
      {...props}
    >
      {checked && <Check size={checkIconSize} color="white" strokeWidth={4} />}
    </Pressable>
  )
})
