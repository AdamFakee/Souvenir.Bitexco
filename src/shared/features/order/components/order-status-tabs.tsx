import { OrderStatus } from '@/shared/lib/database/models/order'
import React, { memo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ORDER_STATUS_CONFIG } from '../constants'
import { useOrderFilterStore } from '../store'

interface OrderStatusTabsProps {
  ordersCount?: number
}

export const OrderStatusTabs = memo(function OrderStatusTabs({
  ordersCount,
}: OrderStatusTabsProps) {
  const { status, setStatus } = useOrderFilterStore()

  return (
    <View className="flex-row gap-0">
      {([OrderStatus.COMPLETED, OrderStatus.REFUNDED, OrderStatus.FAILED, 'ALL'] as const).map(
        (s) => {
          const isActive = s === 'ALL' ? status === null : status === s
          const config = ORDER_STATUS_CONFIG[s]

          return (
            <Pressable
              key={s}
              onPress={() => setStatus(s === 'ALL' ? null : s)}
              className={`border-b-4 px-10 py-5 transition-all ${
                isActive ? 'border-primary' : 'border-transparent'
              }`}
            >
              <View className="flex-row items-center gap-4">
                <Text className={`text-xl font-bold ${isActive ? 'text-primary' : 'text-muted'}`}>
                  {config.label}
                </Text>
                {isActive && ordersCount !== undefined && (
                  <View
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: config.bgColor }}
                  >
                    <Text className="text-sm font-bold" style={{ color: config.color }}>
                      {ordersCount}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          )
        },
      )}
    </View>
  )
})
