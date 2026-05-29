import React from 'react'
import { Text, View } from 'react-native'
import {
  DashboardInfoBar,
  DashboardStatsCards,
  PaymentMethodsPanel,
  ProductRevenuePanel,
} from '@/shared/features/dashboard'

export default function DashboardScreen() {
  return (
    <View className="flex-1 bg-[#f3f4f6] p-6">
      {/* Massive Premium Card Container wrapping all UI */}
      <View className="w-full flex-1 flex-col rounded-3xl border border-[#e2e8f0] bg-white p-8">
        {/* ================= HEADER CONTAINER ================= */}
        <View className="mb-6 flex-col gap-2">
          <Text className="text-[32px] font-extrabold tracking-tight text-[#111827]">
            Báo cáo doanh thu ca hiện tại
          </Text>
          <Text className="text-[16px] font-medium text-[#6b7280]">
            Tổng quan hoạt động và doanh thu trong ca làm việc.
          </Text>
        </View>

        {/* ================= INFO CONTAINER (Self-fetching) ================= */}
        <DashboardInfoBar />

        {/* ================= STATS CONTAINER (Self-fetching) ================= */}
        <DashboardStatsCards />

        {/* ================= CHARTS CONTAINER ================= */}
        <View className="flex-1 flex-row gap-6">
          {/* Left Card: Rotation Donut Panel (Self-fetching) */}
          <PaymentMethodsPanel />

          {/* Right Card: Table Panel (Self-fetching) */}
          <ProductRevenuePanel />
        </View>
      </View>
    </View>
  )
}
