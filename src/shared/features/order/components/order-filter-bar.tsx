import { DatePicker, SearchInput } from '@/shared/components/ui'
import React, { memo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useOrderFilterStore } from '../store'

export const OrderFilterBar = memo(function OrderFilterBar() {
  const { searchQuery, setSearchQuery, dateFrom, setDateFrom, dateTo, setDateTo, scope, setScope } =
    useOrderFilterStore()

  return (
    <View className="mb-6 flex-row items-center gap-6">
      <SearchInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Tìm kiếm đơn hàng..."
        containerClassName="flex-1"
      />

      {/* Bộ lọc phạm vi: Theo ca vs Tất cả */}
      <View className="w-80 flex-row rounded-2xl border border-outline-variant bg-[#f1f5f9] p-1">
        <Pressable
          onPress={() => setScope('SHIFT')}
          className={`flex-1 items-center justify-center rounded-xl py-3.5 ${
            scope === 'SHIFT' ? 'bg-primary' : 'bg-transparent'
          }`}
        >
          <Text
            className={`text-lg font-bold ${scope === 'SHIFT' ? 'text-white' : 'text-[#64748b]'}`}
          >
            Theo ca hiện tại
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setScope('ALL')}
          className={`flex-1 items-center justify-center rounded-xl py-3.5 ${
            scope === 'ALL' ? 'bg-primary' : 'bg-transparent'
          }`}
        >
          <Text
            className={`text-lg font-bold ${scope === 'ALL' ? 'text-white' : 'text-[#64748b]'}`}
          >
            Tất cả các ca
          </Text>
        </Pressable>
      </View>

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
