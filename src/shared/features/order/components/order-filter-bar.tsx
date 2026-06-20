import React, { memo } from 'react'
import { View } from 'react-native'
import { OrderDateFilter } from './order-date-filter'
import { OrderScopeToggle } from './order-scope-toggle'
import { OrderSearchInput } from './order-search-input'

export const OrderFilterBar = memo(function OrderFilterBar() {
  return (
    <View className="mb-6 flex-row items-center gap-6">
      <OrderSearchInput />
      <OrderScopeToggle />
      <OrderDateFilter />
    </View>
  )
})
