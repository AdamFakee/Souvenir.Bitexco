import { COLORS } from '@/shared/constants'
import { getVietnameseMonth } from '@/shared/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import React, { useCallback, useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'

export interface CalendarPopoverProps {
  visible: boolean
  onClose: () => void
  onSelect: (date: Date) => void
  selectedDate: Date | null
  viewDate: Date
  onChangeMonth: (offset: number) => void
  minDate?: Date
  maxDate?: Date
  /** top offset tính từ trigger, mặc định 68 (trigger 64 + gap 4) */
  topOffset?: number
}

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const POPOVER_WIDTH = 420

export function CalendarPopover({
  visible,
  onClose,
  onSelect,
  selectedDate,
  viewDate,
  onChangeMonth,
  minDate,
  maxDate,
  topOffset = 68,
}: CalendarPopoverProps) {
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

  const minTime = useMemo(() => {
    if (!minDate) return null
    const d = new Date(minDate)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [minDate])

  const maxTime = useMemo(() => {
    if (!maxDate) return null
    const d = new Date(maxDate)
    d.setHours(23, 59, 59, 999)
    return d.getTime()
  }, [maxDate])

  const isDisabled = useCallback(
    (day: number) => {
      const time = new Date(year, month, day).getTime()
      if (minTime !== null && time < minTime) return true
      if (maxTime !== null && time > maxTime) return true
      return false
    },
    [year, month, minTime, maxTime],
  )

  const handleSelect = useCallback(
    (day: number) => {
      onSelect(new Date(year, month, day))
    },
    [onSelect, year, month],
  )

  const handleToday = useCallback(() => {
    onSelect(new Date())
  }, [onSelect])

  if (!visible) return null

  return (
    <View
      className="absolute overflow-hidden rounded-3xl border border-outline-variant bg-white shadow-2xl"
      style={{
        top: topOffset,
        left: 0,
        width: POPOVER_WIDTH,
        zIndex: 999,
        elevation: 999,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-outline-variant bg-surface-100 px-6 py-4">
        <Pressable
          onPress={() => onChangeMonth(-1)}
          className="rounded-full p-2.5 active:bg-surface-200"
        >
          <ChevronLeft size={28} color={COLORS.surface.on} />
        </Pressable>

        <Text className="text-xl font-black text-surface-on" numberOfLines={1}>
          {getVietnameseMonth(viewDate.getMonth())}, {viewDate.getFullYear()}
        </Text>

        <Pressable
          onPress={() => onChangeMonth(1)}
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
        <Pressable
          onPress={onClose}
          className="ml-2 min-w-[120px] items-center justify-center rounded-xl px-6 py-3 active:bg-surface-100"
        >
          <Text className="text-lg font-black text-muted" numberOfLines={1}>
            Đóng
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
