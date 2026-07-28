import { COLORS } from '@/shared/constants'
import { formatDate } from '@/shared/utils'
import { Calendar } from 'lucide-react-native'
import React, { useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CalendarPopover, CalendarPopoverRef, AnchorPosition } from './calendar-popover'

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
  const calendarRef = useRef<CalendarPopoverRef>(null)
  const viewRef = useRef<View>(null)
  const layoutRef = useRef<AnchorPosition | null>(null)

  const handleOpen = () => {
    if (layoutRef.current) {
      calendarRef.current?.open(layoutRef.current)
    } else {
      viewRef.current?.measureInWindow(
        (winX: number, winY: number, winWidth: number, winHeight: number) => {
          calendarRef.current?.open({ x: winX, y: winY + 20, width: winWidth, height: winHeight })
        },
      )
    }
  }

  const handleLayout = () => {
    viewRef.current?.measureInWindow(
      (winX: number, winY: number, winWidth: number, winHeight: number) => {
        layoutRef.current = { x: winX, y: winY + 20, width: winWidth, height: winHeight }
      },
    )
  }

  return (
    <View ref={viewRef} className={className} onLayout={handleLayout}>
      <Pressable
        onPress={handleOpen}
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
        ref={calendarRef}
        onSelect={onChange}
        selectedDate={value}
        minDate={minDate}
        maxDate={maxDate}
      />
    </View>
  )
}
