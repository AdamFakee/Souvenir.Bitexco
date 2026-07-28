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
    <View className={`flex-row items-center gap-2 ${className ?? ''}`}>
      <DatePicker
        value={dateFrom}
        onChange={onDateFromChange}
        placeholder="Từ ngày"
        className="w-[200px]"
        maxDate={dateTo || undefined}
        triggerClassName="h-[64px] rounded-xl"
        triggerTextStyle={{ fontSize: 20, fontFamily: 'Manrope-Bold' }}
        triggerIconSize={24}
      />
      <Text className="px-1 text-[20px] font-bold text-muted">đến</Text>
      <DatePicker
        value={dateTo}
        onChange={onDateToChange}
        placeholder="Đến ngày"
        className="w-[200px]"
        minDate={dateFrom || undefined}
        triggerClassName="h-[64px] rounded-xl"
        triggerTextStyle={{ fontSize: 20, fontFamily: 'Manrope-Bold' }}
        triggerIconSize={24}
      />
    </View>
  )
})
