import { DatePicker } from '@/shared/components/ui'
import React, { memo } from 'react'
import { Text, View } from 'react-native'
import { useOrderFilterStore } from '../store'

export const OrderDateFilter = memo(function OrderDateFilter() {
  const dateFrom = useOrderFilterStore((s) => s.dateFrom)
  const setDateFrom = useOrderFilterStore((s) => s.setDateFrom)
  const dateTo = useOrderFilterStore((s) => s.dateTo)
  const setDateTo = useOrderFilterStore((s) => s.setDateTo)

  return (
    <View className="flex-row items-center gap-4">
      <DatePicker
        value={dateFrom}
        onChange={setDateFrom}
        placeholder="Từ ngày"
        className="w-64"
        maxDate={dateTo || undefined}
      />
      <Text className="text-xl font-bold text-muted">đến</Text>
      <DatePicker
        value={dateTo}
        onChange={setDateTo}
        placeholder="Đến ngày"
        className="w-64"
        minDate={dateFrom || undefined}
      />
    </View>
  )
})
