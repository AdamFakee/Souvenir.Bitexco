import { COLORS } from '@/shared/constants'
import { formatDate } from '@/shared/utils'
import { Calendar } from 'lucide-react-native'
import React, { useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CalendarPopover } from './calendar-popover'

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
  const [showCalendar, setShowCalendar] = useState(false)
  const [anchorPosition, setAnchorPosition] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const viewRef = useRef<View>(null)

  const handleOpen = () => {
    viewRef.current?.measureInWindow((x, y, width, height) => {
      setAnchorPosition({ x, y, width, height })
      setShowCalendar(true)
    })
  }

  return (
    <View ref={viewRef} className={className}>
      <Pressable
        onPress={handleOpen}
        className="h-12 flex-row items-center rounded-xl border border-outline-variant bg-white px-4"
      >
        <Calendar size={18} color={COLORS.outline.default} />
        <Text
          className={`ml-2 text-sm font-medium ${value ? 'text-surface-on' : 'text-muted'}`}
          numberOfLines={1}
        >
          {value ? formatDate(value) : placeholder}
        </Text>
      </Pressable>

      <CalendarPopover
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={onChange}
        selectedDate={value}
        anchorPosition={anchorPosition}
        minDate={minDate}
        maxDate={maxDate}
      />
    </View>
  )
}
