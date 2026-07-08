import { SearchInput } from '@/shared/components/ui'
import React, { memo } from 'react'
import { useOrderFilterStore } from '../store'

export const OrderSearchInput = memo(function OrderSearchInput() {
  const searchQuery = useOrderFilterStore((s) => s.searchQuery)
  const setSearchQuery = useOrderFilterStore((s) => s.setSearchQuery)

  return (
    <SearchInput
      value={searchQuery}
      onChangeText={setSearchQuery}
      placeholder="Tìm kiếm đơn hàng..."
      containerClassName="flex-1"
      size="sm"
    />
  )
})
