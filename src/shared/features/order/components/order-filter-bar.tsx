import { DatePicker } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { Search, X } from 'lucide-react-native'
import React, { memo } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useOrderFilterStore } from '../store'

export const OrderFilterBar = memo(function OrderFilterBar() {
  const { searchQuery, setSearchQuery, dateFrom, setDateFrom, dateTo, setDateTo } =
    useOrderFilterStore()

  return (
    <View className="mb-6 flex-row items-center gap-4">
      <View className="h-12 flex-1 flex-row items-center rounded-xl border border-outline-variant bg-surface-100 px-4">
        <Search size={18} color={COLORS.outline.default} />
        <TextInput
          className="ml-3 flex-1 text-base font-medium text-surface-on"
          placeholder="Tìm kiếm đơn hàng..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={18} color={COLORS.outline.default} />
          </Pressable>
        )}
      </View>

      <View className="flex-row items-center gap-3">
        <DatePicker
          value={dateFrom}
          onChange={setDateFrom}
          placeholder="Từ ngày"
          className="w-44"
          maxDate={dateTo || new Date()}
        />
        <Text className="font-medium text-muted">đến</Text>
        <DatePicker
          value={dateTo}
          onChange={setDateTo}
          placeholder="Đến ngày"
          className="w-44"
          minDate={dateFrom || undefined}
          maxDate={new Date()}
        />
      </View>
    </View>
  )
})
