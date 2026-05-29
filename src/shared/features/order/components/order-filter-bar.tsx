import { DatePicker, SearchInput } from '@/shared/components/ui'
import React, { memo } from 'react'
import { Text, View } from 'react-native'
import { useOrderFilterStore } from '../store'

export const OrderFilterBar = memo(function OrderFilterBar() {
  const { searchQuery, setSearchQuery, dateFrom, setDateFrom, dateTo, setDateTo } =
    useOrderFilterStore()

  return (
    <View className="mb-6 flex-row items-center gap-4">
      <SearchInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Tìm kiếm đơn hàng..."
        containerClassName="flex-1"
      />

      <View className="flex-row items-center gap-4">
        <DatePicker
          value={dateFrom}
          onChange={setDateFrom}
          placeholder="Từ ngày"
          className="w-64"
          maxDate={dateTo || new Date()}
        />
        <Text className="text-xl font-bold text-muted">đến</Text>
        <DatePicker
          value={dateTo}
          onChange={setDateTo}
          placeholder="Đến ngày"
          className="w-64"
          minDate={dateFrom || undefined}
          maxDate={new Date()}
        />
      </View>
    </View>
  )
})
