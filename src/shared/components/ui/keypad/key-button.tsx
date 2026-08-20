import React, { memo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { cn } from '@/shared/utils'

interface KeyButtonProps {
  label: string | React.ReactNode
  subLabel?: string
  onPress: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  className?: string
  textClassName?: string
}

export const KeyButton = memo(
  ({
    label,
    subLabel,
    onPress,
    disabled,
    variant = 'primary',
    className,
    textClassName,
  }: KeyButtonProps) => {
    const isStringLabel = typeof label === 'string'

    return (
      <Pressable onPress={onPress} disabled={disabled} className="flex-1">
        {({ pressed }) => (
          <View
            className={cn(
              'aspect-square w-full items-center justify-center rounded-2xl border',
              // Variants
              variant === 'default' && [
                'border-slate-200 bg-white',
                pressed && 'border-slate-300 bg-slate-100',
              ],
              variant === 'primary' && [
                'border-slate-200 bg-white shadow-sm',
                pressed && 'border-slate-300 bg-slate-50',
              ],
              variant === 'danger' && [
                'border-red-100 bg-red-50',
                pressed && 'border-red-200 bg-red-100',
              ],
              variant === 'ghost' && ['border-transparent bg-slate-50', pressed && 'bg-slate-200'],
              disabled && 'opacity-50',
              className,
            )}
          >
            {isStringLabel ? (
              <Text
                className={cn(
                  'text-3xl font-bold text-slate-800',
                  variant === 'danger' && 'text-red-600',
                  variant === 'ghost' && 'text-slate-600',
                  textClassName,
                )}
              >
                {label}
              </Text>
            ) : (
              <View>
                {React.isValidElement(label) &&
                  React.cloneElement(label as React.ReactElement<any>, {
                    color:
                      variant === 'danger'
                        ? '#dc2626'
                        : variant === 'ghost'
                          ? '#475569'
                          : '#1e293b',
                    size: (label.props as any)?.size || 28,
                  })}
              </View>
            )}

            {subLabel ? (
              <Text
                className={cn(
                  'mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400',
                  pressed && 'text-slate-500',
                )}
              >
                {subLabel}
              </Text>
            ) : null}
          </View>
        )}
      </Pressable>
    )
  },
)

KeyButton.displayName = 'KeyButton'
