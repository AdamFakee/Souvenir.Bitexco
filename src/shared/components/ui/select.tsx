import { cn } from '@/shared/utils'
import { Check, ChevronDown } from 'lucide-react-native'
import React, { memo, useCallback, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'

export interface SelectOption<T = string> {
  label: string
  value: T
}

export interface SelectProps<T = string> {
  /** Các option hiển thị trong dropdown */
  options: SelectOption<T>[]
  /** Giá trị đang được chọn */
  value: T | null
  /** Callback khi chọn một option */
  onChange: (value: T) => void
  /** Placeholder khi chưa chọn giá trị */
  placeholder?: string
  /** Custom class cho container */
  className?: string
  /** Custom class cho button trigger */
  triggerClassName?: string
  /** Disable select */
  disabled?: boolean
  /** Chiều cao tối đa của dropdown (mặc định 280) */
  maxDropdownHeight?: number
}

function SelectInner<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  className,
  triggerClassName,
  disabled = false,
  maxDropdownHeight = 280,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<View>(null)
  const { height: windowHeight } = useWindowDimensions()

  const selectedOption = options.find((opt) => opt.value === value)
  const displayText = selectedOption?.label ?? placeholder
  const isPlaceholder = !selectedOption

  const handleSelect = useCallback(
    (opt: SelectOption<T>) => {
      onChange(opt.value)
      setOpen(false)
    },
    [onChange],
  )

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setOpen((prev) => !prev)
    }
  }, [disabled])

  return (
    <View className={cn('relative', className)}>
      {/* Trigger */}
      <Pressable
        ref={triggerRef}
        onPress={handleToggle}
        disabled={disabled}
        className={cn(
          'h-16 flex-row items-center justify-between rounded-xl border border-outline-variant bg-white px-5 active:opacity-80',
          disabled && 'opacity-50',
          triggerClassName,
        )}
      >
        <Text
          className={cn(
            'ml-3 flex-1 text-lg font-medium',
            isPlaceholder ? 'text-muted' : 'text-surface-on',
          )}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <ChevronDown
          size={20}
          color="#8d8e8f"
          style={open ? { transform: [{ rotate: '180deg' }] } : undefined}
        />
      </Pressable>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop full-viewport để bắt tap outside */}
          <Pressable
            onPress={() => setOpen(false)}
            style={{
              position: 'absolute',
              top: -500,
              left: -500,
              right: -500,
              height: windowHeight + 1000,
              zIndex: 10,
            }}
          />

          {/* Options list */}
          <View
            className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-outline-variant bg-white shadow-lg"
            style={{ top: '100%', maxHeight: maxDropdownHeight }}
          >
            <ScrollView bounces={false} showsVerticalScrollIndicator>
              {options.map((opt, index) => {
                const isSelected = opt.value === value
                return (
                  <Pressable
                    key={String(opt.value)}
                    onPress={() => handleSelect(opt)}
                    className={cn(
                      'flex-row items-center justify-between px-5 py-4 active:bg-surface-100',
                      isSelected && 'bg-primary/5',
                      index < options.length - 1 && 'border-b border-outline-variant/20',
                    )}
                  >
                    <Text
                      className={cn(
                        'flex-1 text-lg',
                        isSelected ? 'font-bold text-primary' : 'font-medium text-surface-on',
                      )}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Check size={20} color="#2563eb" />}
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  )
}

// Ép kiểu generic cho memo — cần thiết vì memo không giữ được type parameter
const SelectComponent = memo(SelectInner) as <T extends string = string>(
  props: SelectProps<T>,
) => React.ReactElement
export { SelectComponent as Select }
