import { COLORS } from '@/shared/constants'
import { formatDate } from '@/shared/utils'
import { Calendar } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CalendarPopover } from './calendar-popover'

interface DatePickerProps {
  value: Date | null
  onChange: (date: Date) => void
  placeholder: string
  className?: string
  minDate?: Date
  maxDate?: Date
  triggerClassName?: string
  triggerTextClassName?: string
  triggerTextStyle?: any
  triggerIconSize?: number
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  className,
  minDate,
  maxDate,
  triggerClassName,
  triggerTextClassName,
  triggerTextStyle,
  triggerIconSize,
}: DatePickerProps) {
  const [show, setShow] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    const d = value || new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const handleToggle = useCallback(() => setShow((v) => !v), [])

  const handleSelect = useCallback(
    (date: Date) => {
      onChange(date)
      setShow(false)
    },
    [onChange],
  )

  const handleChangeMonth = useCallback(
    (offset: number) => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + offset, 1)),
    [],
  )

  return (
    <View className={className} style={{ zIndex: show ? 50 : 1, elevation: show ? 50 : 0 }}>
      <Pressable
        onPress={handleToggle}
        className={`h-11 flex-row items-center rounded-xl border border-outline-variant bg-white px-4 ${triggerClassName ?? ''}`}
      >
        <Calendar size={triggerIconSize ?? 20} color={COLORS.outline.default} />
        <Text
          className={`ml-2 text-base font-medium ${value ? 'text-surface-on' : 'text-muted'} ${triggerTextClassName ?? ''}`}
          numberOfLines={1}
          style={triggerTextStyle}
        >
          {value ? formatDate(value) : placeholder}
        </Text>
      </Pressable>

      <CalendarPopover
        visible={show}
        onClose={() => setShow(false)}
        onSelect={handleSelect}
        selectedDate={value}
        viewDate={viewDate}
        onChangeMonth={handleChangeMonth}
        minDate={minDate}
        maxDate={maxDate}
      />
    </View>
  )
}
