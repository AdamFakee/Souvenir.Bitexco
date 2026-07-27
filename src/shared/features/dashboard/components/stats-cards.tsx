import { Shimmer } from '@/shared/components/ui/shimmer'
import { formatCurrency } from '@/shared/utils'
import { Coffee, ShoppingBag, TrendingUp, X } from 'lucide-react-native'
import React, { memo } from 'react'
import { Text, View } from 'react-native'
import { GiftBoxIcon, MoneyBagIcon } from '../icons'
import type { DashboardOverviewResponse } from '../types'

interface DashboardStatsCardsProps {
  overview: DashboardOverviewResponse | null
  isLoading: boolean
}

export const DashboardStatsCards = memo(function DashboardStatsCards({
  overview,
  isLoading,
}: DashboardStatsCardsProps) {
  if (isLoading) {
    return (
      <View className="mb-6 flex-row gap-5">
        {[1, 2, 3, 4].map((idx) => (
          <View
            key={idx}
            style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
            className="relative min-h-[128px] flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-[#e5e7eb]/40 p-6"
          >
            <Shimmer className="h-5 w-28" />
            <Shimmer className="mt-1 h-10 w-36" />
            <View className="absolute bottom-5 right-6">
              <Shimmer className="h-12 w-12 rounded-full" />
            </View>
          </View>
        ))}
      </View>
    )
  }

  if (!overview) return null

  return (
    <View className="mb-6 flex-row gap-5">
      <View
        style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
        className="relative flex-1 flex-col gap-2 overflow-hidden rounded-2xl border border-[#e5e7eb]/40 p-6"
      >
        <Text className="text-[17px] font-extrabold text-[#4b5563]">Tổng doanh thu</Text>
        <Text className="text-[34px] font-black text-[#007D55]">
          {formatCurrency(overview.totalRevenue)}
        </Text>
        <MoneyBagIcon tagColor="#007D55" badgeColor="#22c55e" IconComponent={TrendingUp} />
      </View>

      <View
        style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
        className="relative flex-1 flex-col gap-2 overflow-hidden rounded-2xl border border-[#e5e7eb]/40 p-6"
      >
        <Text className="text-[17px] font-extrabold text-[#4b5563]">Số đơn hàng</Text>
        <Text className="text-[34px] font-black text-[#007D55]">{overview.completedOrders}</Text>
        <GiftBoxIcon tagColor="#007D55" badgeColor="#3b82f6" IconComponent={ShoppingBag} />
      </View>

      <View
        style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
        className="relative flex-1 flex-col gap-2 overflow-hidden rounded-2xl border border-[#e5e7eb]/40 p-6"
      >
        <Text className="text-[17px] font-extrabold text-[#4b5563]">Số sản phẩm đã bán</Text>
        <Text className="text-[34px] font-black text-[#007D55]">{overview.totalProductsSold}</Text>
        <GiftBoxIcon tagColor="#007D55" badgeColor="#0ea5e9" IconComponent={Coffee} />
      </View>

      <View
        style={{ backgroundColor: 'rgba(254, 242, 242, 0.6)' }}
        className="relative flex-1 flex-col gap-2 overflow-hidden rounded-2xl border border-[#ef4444]/10 p-6"
      >
        <Text className="text-[17px] font-extrabold text-[#4b5563]">Số đơn đã hủy</Text>
        <Text className="text-[34px] font-black text-[#ef4444]">{overview.cancelledOrders}</Text>
        <GiftBoxIcon tagColor="#ef4444" badgeColor="#ef4444" IconComponent={X} />
      </View>
    </View>
  )
})
