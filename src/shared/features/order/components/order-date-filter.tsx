import { DatePicker } from '@/shared/components/ui'
import React, { memo } from 'react'
import { Text, View } from 'react-native'

export interface DateRangeFilterProps {
  dateFrom: Date | null
  dateTo: Date | null
  onDateFromChange: (date: Date) => void
  onDateToChange: (date: Date) => void
  className?: string
}

export const DateRangeFilter = memo(function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  className,
}: DateRangeFilterProps) {
  return (
    <View className={`flex-row items-center gap-4 ${className ?? ''}`}>
      <DatePicker
        value={dateFrom}
        onChange={onDateFromChange}
        placeholder="Từ ngày"
        className="w-64"
        maxDate={dateTo || undefined}
      />
      <Text className="text-xl font-bold text-muted">đến</Text>
      <DatePicker
        value={dateTo}
        onChange={onDateToChange}
        placeholder="Đến ngày"
        className="w-64"
        minDate={dateFrom || undefined}
      />
    </View>
  )
})
