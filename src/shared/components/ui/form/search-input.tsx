import { COLORS } from '@/shared/constants'
import { cn } from '@/shared/utils'
import { Search, X } from 'lucide-react-native'
import React from 'react'
import { Pressable, TextInput, TextInputProps, View } from 'react-native'

interface SearchInputProps extends Omit<TextInputProps, 'style'> {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  placeholderTextColor?: string
  containerClassName?: string
  inputClassName?: string
  iconSize?: number
  onClear?: () => void
  size?: 'sm' | 'md' | 'lg'
}

// ponytail: memo so it doesn't re-create on every keystroke when parent re-renders.
// The TextInput itself handles its own value; we only re-render when props truly change.
export const SearchInput = React.memo(function SearchInput({
  value,
  onChangeText,
  placeholder = 'Tìm kiếm...',
  placeholderTextColor = '#8d8e8f',
  containerClassName,
  inputClassName,
  iconSize,
  onClear,
  size = 'md',
  ...props
}: SearchInputProps) {
  const isLarge = size === 'lg'
  const isSmall = size === 'sm'
  const defaultIconSize = iconSize || (isLarge ? 32 : isSmall ? 20 : 24)

  const handleClear = () => {
    onChangeText('')
    onClear?.()
  }

  return (
    <View
      className={cn(
        'flex-row items-center border border-outline-variant bg-background',
        isLarge
          ? 'h-26 rounded-3xl px-10'
          : isSmall
            ? 'h-11 rounded-xl px-4'
            : 'h-16 rounded-xl px-6',
        containerClassName,
      )}
    >
      <Search
        size={defaultIconSize}
        color={isLarge ? COLORS.outline.variant : COLORS.outline.default}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        className={cn(
          'h-full flex-1 bg-transparent px-0 text-surface-on',
          isLarge ? 'ml-6' : isSmall ? 'ml-2' : 'ml-4',
          inputClassName,
        )}
        style={{
          fontFamily: isLarge ? 'Manrope-Bold' : 'Manrope-Medium',
          fontSize: isLarge ? 24 : isSmall ? 15 : 20,
          color: '#0f0f0f',
          paddingVertical: 0, // Prevent default Android vertical padding
        }}
        {...props}
      />
      {value.length > 0 && (
        <Pressable onPress={handleClear} className="ml-2 active:opacity-60">
          <X
            size={defaultIconSize}
            color={isLarge ? COLORS.outline.variant : COLORS.outline.default}
          />
        </Pressable>
      )}
    </View>
  )
})
