import { LoadingIndicator } from '@/shared/components/ui'
import { useAppContext } from '@/shared/features/app'
import { DashboardCharts, DashboardStatCard, useDashboardStats } from '@/shared/features/order'

import { formatCurrency } from '@/shared/utils'
import {
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Package,
  QrCode,
  Wallet,
  XCircle,
} from 'lucide-react-native'
import React from 'react'
import { ScrollView, Text, View } from 'react-native'

export default function DashboardScreen() {
  const { cashSessionId, employee } = useAppContext()

  const { stats, isLoading } = useDashboardStats(cashSessionId ?? undefined)

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <LoadingIndicator />
      </View>
    )
  }

  return (
    <View style={{ backgroundColor: '#f8fafc' }} className="flex-1">
      <View className="page-header sticky top-0 z-10 border-b border-outline-variant bg-surface px-12 py-10">
        <Text className="text-5xl font-black tracking-tighter text-surface-on">
          Báo cáo ca làm việc
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 40, paddingBottom: 120 }}>
        <View className="mx-auto w-full max-w-[1400px]">
          {/* Dashboard Info */}
          <View className="mb-10 flex-row items-center justify-between rounded-[32px] border border-outline-variant bg-surface px-10 py-8 shadow-sm">
            <View className="flex-row items-center">
              <Text className="text-2xl font-medium text-surface-on-variant">Nhân viên:</Text>
              <Text className="ml-3 text-2xl font-black text-primary">
                {employee?.displayName || '—'}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-2xl font-medium text-surface-on-variant">Ca làm việc:</Text>
              <Text className="ml-3 text-2xl font-black text-surface-on">Đang hoạt động</Text>
            </View>
          </View>

          {/* 4 Main Stats */}
          <View className="mb-10 flex-row gap-8">
            <DashboardStatCard
              label="Tổng doanh thu"
              value={formatCurrency(stats.totalRevenue)}
              icon={CircleDollarSign}
              iconBgColor="#e0e7ff"
              iconColor="#4338ca"
            />
            <DashboardStatCard
              label="Tiền mặt"
              value={formatCurrency(stats.revCash)}
              icon={Wallet}
              iconBgColor="#e0f2fe"
              iconColor="#0284c7"
            />
            <DashboardStatCard
              label="QR Code"
              value={formatCurrency(stats.revQr)}
              icon={QrCode}
              iconBgColor="#fce7f3"
              iconColor="#db2777"
            />
            <DashboardStatCard
              label="Thẻ"
              value={formatCurrency(stats.revCard)}
              icon={CreditCard}
              iconBgColor="#fef08a"
              iconColor="#ca8a04"
            />
          </View>

          {/* 3 Secondary Stats */}
          <View className="mb-10 flex-row gap-8">
            <DashboardStatCard
              label="Đơn hoàn thành"
              value={stats.completedOrders.toString()}
              icon={CheckCircle2}
              iconBgColor="#dcfce7"
              iconColor="#16a34a"
            />
            <DashboardStatCard
              label="Đơn đã hủy"
              value={stats.cancelledOrders.toString()}
              icon={XCircle}
              iconBgColor="#fee2e2"
              iconColor="#ef4444"
            />
            <DashboardStatCard
              label="Sản phẩm đã bán"
              value={stats.totalProducts.toString()}
              icon={Package}
              iconBgColor="#e0e7ff"
              iconColor="#4f46e5"
            />
          </View>

          {/* Charts */}
          <DashboardCharts
            topProducts={stats.topProducts}
            paymentMethodsData={stats.paymentMethodsData}
          />
        </View>
      </ScrollView>
    </View>
  )
}
