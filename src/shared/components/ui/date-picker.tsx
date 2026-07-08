import { COLORS } from '@/shared/constants'
import { formatDate } from '@/shared/utils'
import { Calendar } from 'lucide-react-native'
import React, { useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CalendarPopover, CalendarPopoverRef } from './calendar-popover'

interface DatePickerProps {
  value: Date | null
  onChange: (date: Date) => void
  placeholder: string
  className?: string
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const calendarRef = useRef<CalendarPopoverRef>(null)
  const viewRef = useRef<View>(null)

  const handleOpen = () => {
    viewRef.current?.measureInWindow(
      (winX: number, winY: number, winWidth: number, winHeight: number) => {
        calendarRef.current?.open({ x: winX, y: winY + 20, width: winWidth, height: winHeight })
      },
    )
  }

  return (
    <View ref={viewRef} className={className}>
      <Pressable
        onPress={handleOpen}
        className="h-11 flex-row items-center rounded-xl border border-outline-variant bg-white px-4"
      >
        <Calendar size={20} color={COLORS.outline.default} />
        <Text
          className={`ml-2 text-base font-medium ${value ? 'text-surface-on' : 'text-muted'}`}
          numberOfLines={1}
        >
          {value ? formatDate(value) : placeholder}
        </Text>
      </Pressable>

      <CalendarPopover
        ref={calendarRef}
        onSelect={onChange}
        selectedDate={value}
        minDate={minDate}
        maxDate={maxDate}
      />
    </View>
  )
}
