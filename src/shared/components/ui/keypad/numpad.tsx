import { cn } from '@/shared/utils'
import React, { memo } from 'react'
import { View } from 'react-native'
import { KeyButton } from './key-button'

interface NumpadProps {
  onPress: (digit: string) => void
  onBackspace: () => void
  onClear?: () => void
  leftAction?: React.ReactNode | string
  rightAction?: React.ReactNode | string
  onLeftActionPress?: () => void
  onRightActionPress?: () => void
  className?: string
  disabled?: boolean
}

export const Numpad = memo(
  ({
    onPress,
    onBackspace,
    onClear,
    leftAction,
    rightAction,
    onLeftActionPress,
    onRightActionPress,
    className,
    disabled,
  }: NumpadProps) => {
    return (
      <View className={cn('w-full gap-3', className)}>
        <View className="flex-row gap-3">
          <KeyButton label="1" onPress={() => onPress('1')} disabled={disabled} />
          <KeyButton label="2" onPress={() => onPress('2')} disabled={disabled} />
          <KeyButton label="3" onPress={() => onPress('3')} disabled={disabled} />
        </View>
        <View className="flex-row gap-3">
          <KeyButton label="4" onPress={() => onPress('4')} disabled={disabled} />
          <KeyButton label="5" onPress={() => onPress('5')} disabled={disabled} />
          <KeyButton label="6" onPress={() => onPress('6')} disabled={disabled} />
        </View>
        <View className="flex-row gap-3">
          <KeyButton label="7" onPress={() => onPress('7')} disabled={disabled} />
          <KeyButton label="8" onPress={() => onPress('8')} disabled={disabled} />
          <KeyButton label="9" onPress={() => onPress('9')} disabled={disabled} />
        </View>
        <View className="flex-row gap-3">
          {leftAction ? (
            <KeyButton
              label={leftAction}
              onPress={onLeftActionPress || (() => {})}
              variant="ghost"
              disabled={disabled}
            />
          ) : onClear ? (
            <KeyButton label="C" onPress={onClear} variant="danger" disabled={disabled} />
          ) : (
            <View className="flex-1" />
          )}

          <KeyButton label="0" onPress={() => onPress('0')} disabled={disabled} />

          {rightAction ? (
            <KeyButton
              label={rightAction}
              onPress={onRightActionPress || onBackspace}
              variant="ghost"
              disabled={disabled}
            />
          ) : (
            <KeyButton
              label="DEL" // Default backspace could go here but we handle customize
              onPress={onBackspace}
              variant="danger"
              disabled={disabled}
            />
          )}
        </View>
      </View>
    )
  },
)

Numpad.displayName = 'Numpad'
