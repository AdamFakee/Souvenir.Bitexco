import { cn } from '@/shared/utils'
import { LucideIcon, Eye, EyeOff } from 'lucide-react-native'
import React, { useState } from 'react'
import { TextInput, TextInputProps, View, Pressable } from 'react-native'

export interface InputProps extends TextInputProps {
  className?: string
  error?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  iconColor?: string
  iconSize?: number
  containerStyle?: any
  focusedContainerStyle?: any
}

export const Input = ({
  className,
  error,
  style,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  iconColor = '#8d8e8f',
  iconSize = 22,
  secureTextEntry,
  containerStyle,
  focusedContainerStyle,
  onFocus,
  onBlur,
  ...props
}: InputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = secureTextEntry === true

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <View
      className={cn(
        'flex-row rounded-lg border bg-white px-4',
        props.multiline ? 'min-h-[140px] items-start py-4' : 'h-[60px] items-center',
        error ? 'border-error bg-error-container' : isFocused ? 'border-primary' : 'border-outline',
        className,
      )}
      style={[containerStyle, isFocused && focusedContainerStyle]}
    >
      {LeftIcon && <LeftIcon size={iconSize} color={iconColor} style={{ marginRight: 12 }} />}
      <TextInput
        placeholderTextColor="#8d8e8f"
        secureTextEntry={isPassword && !showPassword}
        onFocus={(e) => {
          setIsFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          onBlur?.(e)
        }}
        style={[
          {
            flex: 1,
            fontFamily: 'Manrope-Medium',
            fontSize: 15,
            color: '#0f0f0f',
            height: '100%',
            paddingVertical: 0,
          },
          style,
        ]}
        {...props}
      />
      {isPassword ? (
        <Pressable onPress={togglePasswordVisibility} style={{ padding: 4, marginLeft: 8 }}>
          {showPassword ? (
            <EyeOff size={iconSize} color={iconColor} />
          ) : (
            <Eye size={iconSize} color={iconColor} />
          )}
        </Pressable>
      ) : (
        RightIcon && <RightIcon size={iconSize} color={iconColor} style={{ marginLeft: 12 }} />
      )}
    </View>
  )
}
