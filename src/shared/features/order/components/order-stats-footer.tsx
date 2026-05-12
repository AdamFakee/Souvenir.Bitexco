import { COLORS } from '@/shared/constants'
import { formatCurrency } from '@/shared/utils'
import { Box, ListChecks } from 'lucide-react-native'
import React, { memo } from 'react'
import { Text, View } from 'react-native'

interface OrderStats {
  totalRevenue: number
  totalItems: number
  count: number
}

interface OrderStatsFooterProps {
  stats: OrderStats
}

export const OrderStatsFooter = memo(function OrderStatsFooter({ stats }: OrderStatsFooterProps) {
  return (
    <View className="flex-row items-center border-t-2 border-outline-variant bg-[#f8fafc] px-8 py-6">
      <View className="mr-8 w-64 flex-row items-center gap-3">
        <ListChecks size={24} color={COLORS.outline.default} />
        <Text className="text-lg font-medium text-muted">
          Tổng cộng: <Text className="font-bold text-surface-on">{stats.count} đơn</Text>
        </Text>
      </View>
      <View className="mr-8 w-64 flex-row items-center gap-3">
        <Box size={24} color={COLORS.outline.default} />
        <Text className="text-lg font-medium text-muted">
          Sản phẩm: <Text className="font-bold text-surface-on">{stats.totalItems}</Text>
        </Text>
      </View>
      <View className="flex-1" />
      <View className="flex-row items-center gap-6">
        <Text className="text-lg font-medium text-muted">(Chỉ tính đơn hàng đã hoàn thành)</Text>
        <Text className="text-3xl font-black text-primary" numberOfLines={1}>
          {formatCurrency(stats.totalRevenue)}
        </Text>
      </View>
    </View>
  )
})
