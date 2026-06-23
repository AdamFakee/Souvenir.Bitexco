import { COLORS } from '@/shared/constants'
import { getVietnameseMonth } from '@/shared/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import React, { useCallback, useImperativeHandle, useMemo, useState } from 'react'
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { GlobalToast } from './global-toast'

/**
 * Đại diện cho vị trí và kích thước của component kích hoạt (trigger)
 * Dùng để tính toán vị trí hiển thị popover ngay bên dưới component đó.
 */
export interface AnchorPosition {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Interface cho ref của CalendarPopover
 */
export interface CalendarPopoverRef {
  open: (anchor: AnchorPosition) => void
  close: () => void
}

interface CalendarPopoverProps {
  onSelect: (date: Date) => void
  selectedDate: Date | null
  minDate?: Date
  maxDate?: Date
  ref?: React.Ref<CalendarPopoverRef>
}

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const POPOVER_WIDTH = 420

export function CalendarPopover({
  onSelect,
  selectedDate,
  minDate,
  maxDate,
  ref,
}: CalendarPopoverProps) {
  const [visible, setVisible] = useState(false)
  const [anchorPosition, setAnchorPosition] = useState<AnchorPosition | null>(null)
  const [viewDate, setViewDate] = useState(new Date())

  const { width: windowWidth } = useWindowDimensions()

  // Tất cả useMemo / useCallback phải gọi trước return null
  const { days, today, year, month } = useMemo(() => {
    const y = viewDate.getFullYear()
    const m = viewDate.getMonth()
    const totalDays = new Date(y, m + 1, 0).getDate()
    const firstDay = (() => {
      const d = new Date(y, m, 1).getDay()
      return d === 0 ? 6 : d - 1
    })()

    const d: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) d.push(null)
    for (let i = 1; i <= totalDays; i++) d.push(i)

    const now = new Date()
    return {
      days: d,
      today: { d: now.getDate(), m: now.getMonth(), y: now.getFullYear() },
      year: y,
      month: m,
    }
  }, [viewDate])

  const isToday = useCallback(
    (day: number) => day === today.d && month === today.m && year === today.y,
    [today, year, month],
  )

  const isSelected = useCallback(
    (day: number) =>
      !!selectedDate &&
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear(),
    [selectedDate, year, month],
  )

  const isDisabled = useCallback(
    (day: number) => {
      const d = new Date(year, month, day)
      if (minDate) {
        const min = new Date(minDate)
        min.setHours(0, 0, 0, 0)
        if (d < min) return true
      }
      if (maxDate) {
        const max = new Date(maxDate)
        max.setHours(23, 59, 59, 999)
        if (d > max) return true
      }
      return false
    },
    [year, month, minDate, maxDate],
  )

  const changeMonth = useCallback(
    (offset: number) => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + offset, 1)),
    [],
  )

  const handleSelect = useCallback(
    (day: number) => {
      onSelect(new Date(year, month, day))
      setVisible(false)
    },
    [onSelect, year, month],
  )

  const handleToday = useCallback(() => {
    onSelect(new Date())
    setVisible(false)
  }, [onSelect])

  useImperativeHandle(ref, () => ({
    open: (anchor: AnchorPosition) => {
      const dateToShow = selectedDate || new Date()
      setViewDate(new Date(dateToShow.getFullYear(), dateToShow.getMonth(), 1))
      setAnchorPosition(anchor)
      setVisible(true)
    },
    close: () => setVisible(false),
  }))

  if (!anchorPosition) return null

  // Calculate position: below the anchor
  let left = anchorPosition.x
  if (left + POPOVER_WIDTH > windowWidth - 20) {
    left = windowWidth - POPOVER_WIDTH - 20
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <Pressable className="flex-1 bg-black/10" onPress={() => setVisible(false)}>
        <View
          className="absolute overflow-hidden rounded-3xl border border-outline-variant bg-white shadow-2xl"
          style={{
            top: anchorPosition.y + anchorPosition.height + 12,
            left: left,
            width: POPOVER_WIDTH,
          }}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-outline-variant bg-surface-100 px-6 py-4">
            <Pressable
              onPress={() => changeMonth(-1)}
              className="rounded-full p-2.5 active:bg-surface-200"
            >
              <ChevronLeft size={28} color={COLORS.surface.on} />
            </Pressable>

            <Text className="text-xl font-black text-surface-on" numberOfLines={1}>
              {getVietnameseMonth(viewDate.getMonth())}, {viewDate.getFullYear()}
            </Text>

            <Pressable
              onPress={() => changeMonth(1)}
              className="rounded-full p-2.5 active:bg-surface-200"
            >
              <ChevronRight size={28} color={COLORS.surface.on} />
            </Pressable>
          </View>

          {/* Calendar Grid */}
          <View className="p-4">
            {/* Weekdays */}
            <View className="mb-4 flex-row">
              {DAYS_OF_WEEK.map((day) => (
                <View key={day} className="flex-1 items-center">
                  <Text className="text-base font-bold text-muted">{day}</Text>
                </View>
              ))}
            </View>

            {/* Days */}
            <View className="flex-row flex-wrap">
              {days.map((day, index) => {
                const disabled = day ? isDisabled(day) : false
                return (
                  <View key={index} style={{ width: '14.28%', aspectRatio: 1 }}>
                    {day ? (
                      <Pressable
                        onPress={() => !disabled && handleSelect(day)}
                        disabled={disabled}
                        className={`m-1.5 flex-1 items-center justify-center rounded-xl ${
                          isSelected(day)
                            ? 'bg-primary'
                            : isToday(day)
                              ? 'bg-primary-fixed'
                              : 'active:bg-surface-200'
                        } ${disabled ? 'opacity-20' : 'opacity-100'}`}
                      >
                        <Text
                          className={`text-lg font-bold ${
                            isSelected(day)
                              ? 'text-white'
                              : isToday(day)
                                ? 'text-primary'
                                : 'text-surface-on'
                          }`}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    ) : (
                      <View className="flex-1" />
                    )}
                  </View>
                )
              })}
            </View>
          </View>

          {/* Footer */}
          <View className="flex-row justify-end border-t border-outline-variant p-3">
            <Pressable
              onPress={handleToday}
              className="min-w-[120px] items-center justify-center rounded-xl px-6 py-3 active:bg-surface-100"
            >
              <Text className="text-lg font-black text-primary" numberOfLines={1}>
                Hôm nay
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
      <GlobalToast />
    </Modal>
  )
}
