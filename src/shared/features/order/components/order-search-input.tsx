import { SearchInput } from '@/shared/components/ui/form/search-input'
import React, { memo, useEffect, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { useOrderFilterStore } from '../store'

/**
 * Controlled local value + debounced store write.
 * Gõ chỉ re-render input này; list query đổi sau 300ms.
 */
export const OrderSearchInput = memo(function OrderSearchInput() {
  const storeQuery = useOrderFilterStore((s) => s.searchQuery)
  const setSearchQuery = useOrderFilterStore((s) => s.setSearchQuery)
  const [local, setLocal] = useState(storeQuery)

  // Sync ngoài → trong (reset filters)
  useEffect(() => {
    setLocal(storeQuery)
  }, [storeQuery])

  const pushStore = useDebouncedCallback((text: string) => {
    setSearchQuery(text)
  }, 300)

  return (
    <SearchInput
      value={local}
      onChangeText={(text) => {
        setLocal(text)
        pushStore(text)
      }}
      placeholder="Tìm kiếm đơn hàng..."
      containerClassName="h-14 flex-1 rounded-xl"
      size="md"
    />
  )
})
