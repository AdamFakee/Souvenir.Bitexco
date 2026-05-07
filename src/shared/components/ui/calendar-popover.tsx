import { COLORS } from '@/shared/constants'
import { getVietnameseMonth } from '@/shared/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { Dimensions, Modal, Pressable, Text, View } from 'react-native'

interface CalendarPopoverProps {
  visible: boolean
  onClose: () => void
  onSelect: (date: Date) => void
  selectedDate: Date | null
  anchorPosition: { x: number; y: number; width: number; height: number } | null
  minDate?: Date
  maxDate?: Date
}

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function CalendarPopover({
  visible,
  onClose,
  onSelect,
  selectedDate,
  anchorPosition,
  minDate,
  maxDate,
}: CalendarPopoverProps) {
  const [viewDate, setViewDate] = useState(new Date())

  useEffect(() => {
    if (visible) {
      const dateToShow = selectedDate || new Date()
      setViewDate(new Date(dateToShow.getFullYear(), dateToShow.getMonth(), 1))
    }
  }, [visible, selectedDate])

  if (!visible || !anchorPosition) return null

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  const generateDays = () => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const days: (number | null)[] = []

    const firstDay = firstDayOfMonth(year, month)
    const totalDays = daysInMonth(year, month)

    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    for (let i = 1; i <= totalDays; i++) {
      days.push(i)
    }

    return days
  }

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1))
  }

  const handleSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    onSelect(newDate)
    onClose()
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear()
    )
  }

  const isSelected = (day: number) => {
    return (
      selectedDate &&
      day === selectedDate.getDate() &&
      viewDate.getMonth() === selectedDate.getMonth() &&
      viewDate.getFullYear() === selectedDate.getFullYear()
    )
  }

  const isDisabled = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
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
  }

  // Calculate position: below the anchor
  const windowWidth = Dimensions.get('window').width
  const popoverWidth = 320
  let left = anchorPosition.x
  if (left + popoverWidth > windowWidth - 20) {
    left = windowWidth - popoverWidth - 20
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/10" onPress={onClose}>
        <View
          className="absolute overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-xl"
          style={{
            top: anchorPosition.y + anchorPosition.height + 8,
            left: left,
            width: popoverWidth,
          }}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-outline-variant bg-surface-100 px-4 py-3">
            <Pressable
              onPress={() => changeMonth(-1)}
              className="rounded-full p-2 active:bg-surface-200"
            >
              <ChevronLeft size={20} color={COLORS.surface.on} />
            </Pressable>

            <Text className="text-base font-bold text-surface-on" numberOfLines={1}>
              {getVietnameseMonth(viewDate.getMonth())}, {viewDate.getFullYear()}
            </Text>

            <Pressable
              onPress={() => changeMonth(1)}
              className="rounded-full p-2 active:bg-surface-200"
            >
              <ChevronRight size={20} color={COLORS.surface.on} />
            </Pressable>
          </View>

          {/* Calendar Grid */}
          <View className="p-3">
            {/* Weekdays */}
            <View className="mb-2 flex-row">
              {DAYS_OF_WEEK.map((day) => (
                <View key={day} className="flex-1 items-center">
                  <Text className="text-xs font-bold text-muted">{day}</Text>
                </View>
              ))}
            </View>

            {/* Days */}
            <View className="flex-row flex-wrap">
              {generateDays().map((day, index) => {
                const disabled = day ? isDisabled(day) : false
                return (
                  <View key={index} style={{ width: '14.28%', aspectRatio: 1 }}>
                    {day ? (
                      <Pressable
                        onPress={() => !disabled && handleSelect(day)}
                        disabled={disabled}
                        className={`m-1 flex-1 items-center justify-center rounded-lg ${
                          isSelected(day)
                            ? 'bg-primary'
                            : isToday(day)
                              ? 'bg-primary-fixed'
                              : 'active:bg-surface-200'
                        } ${disabled ? 'opacity-20' : 'opacity-100'}`}
                      >
                        <Text
                          className={`text-sm font-bold ${
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
          <View className="flex-row justify-end border-t border-outline-variant p-2">
            <Pressable
              onPress={() => {
                onSelect(new Date())
                onClose()
              }}
              className="rounded-lg px-4 py-2 active:bg-surface-100"
            >
              <Text className="text-sm font-bold text-primary">Hôm nay</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  )
}
