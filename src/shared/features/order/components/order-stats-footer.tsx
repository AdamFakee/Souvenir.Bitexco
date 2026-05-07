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
    <View className="flex-row items-center border-t-2 border-outline-variant bg-[#f8fafc] px-8 py-5">
      <View className="mr-6 w-48 flex-row items-center gap-2">
        <ListChecks size={18} color={COLORS.outline.default} />
        <Text className="text-sm font-medium text-muted">
          Tổng cộng: <Text className="font-bold text-surface-on">{stats.count} đơn</Text>
        </Text>
      </View>
      <View className="mr-6 w-48 flex-row items-center gap-2">
        <Box size={18} color={COLORS.outline.default} />
        <Text className="text-sm font-medium text-muted">
          Sản phẩm: <Text className="font-bold text-surface-on">{stats.totalItems}</Text>
        </Text>
      </View>
      <View className="flex-1" />
      <View className="flex-row items-center gap-4">
        <Text className="text-sm font-medium text-muted">(Chỉ tính đơn hàng đã hoàn thành)</Text>
        <Text className="text-2xl font-black text-primary" numberOfLines={1}>
          {formatCurrency(stats.totalRevenue)}
        </Text>
      </View>
    </View>
  )
})
