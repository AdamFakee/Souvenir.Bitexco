import { COLORS } from '@/shared/constants'
import { getVietnameseMonth } from '@/shared/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import React, { useImperativeHandle, useState } from 'react'
import { Dimensions, Modal, Pressable, Text, View } from 'react-native'
import { GlobalToast } from './global-toast'

/**
 * Đại diện cho vị trí và kích thước của component kích hoạt (trigger)
 * Dùng để tính toán vị trí hiển thị popover ngay bên dưới component đó.
 */
export interface AnchorPosition {
  x: number // Tọa độ x trong cửa sổ (window)
  y: number // Tọa độ y trong cửa sổ (window)
  width: number // Chiều rộng của component trigger
  height: number // Chiều cao của component trigger
}

/**
 * Interface cho ref của CalendarPopover
 * Cho phép component cha điều khiển việc đóng/mở bộ lịch một cách chủ động (imperative)
 */
export interface CalendarPopoverRef {
  /**
   * Mở bộ lịch tại vị trí của component trigger (anchor)
   */
  open: (anchor: AnchorPosition) => void
  /**
   * Đóng bộ lịch
   */
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
    setVisible(false)
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
  const popoverWidth = 420
  let left = anchorPosition.x
  if (left + popoverWidth > windowWidth - 20) {
    left = windowWidth - popoverWidth - 20
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
            width: popoverWidth,
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
              {generateDays().map((day, index) => {
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
              onPress={() => {
                onSelect(new Date())
                setVisible(false)
              }}
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
