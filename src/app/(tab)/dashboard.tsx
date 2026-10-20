import { useCashSessionId, useEmployee } from '@/features/app'
import { useGetDashboardOverview } from '@/features/dashboard'
import { DashboardSkeleton } from '@/features/dashboard/components/dashboard-skeleton'
import { DashboardInfoBar } from '@/features/dashboard/components/info-bar'
import { PaymentMethodsPanel } from '@/features/dashboard/components/payment-methods-panel'
import { ProductRevenuePanel } from '@/features/dashboard/components/product-revenue-panel'
import { DashboardStatsCards } from '@/features/dashboard/components/stats-cards'
import { StaffSelect } from '@/features/order/components/order-staff-select'
import { LazyTabShell } from '@/shared/components/ui/lazy-tab-shell'
import { COLORS } from '@/shared/constants'
import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'

function DashboardContent() {
  const employee = useEmployee()
  const cashSessionId = useCashSessionId()
  // Default ngay từ employee — tránh 1 frame staffId=null → query key nhảy
  const [staffId, setStaffId] = useState<string | null>(() => employee?.id ?? null)

  const handleStaffChange = useCallback((id: string | null) => {
    requestAnimationFrame(() => setStaffId(id))
  }, [])

  const shiftId = cashSessionId ?? undefined
  const { overview, isLoading, isFetching, error, refetch } = useGetDashboardOverview(
    shiftId,
    staffId,
  )

  const [refreshing, setRefreshing] = useState(false)
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  const handleRetry = useCallback(() => refetch(), [refetch])

  // isFetching tách ra ngoài memo để background refetch không trigger recompute 4 panel nặng
  const body = useMemo(() => {
    if (!shiftId) {
      return (
        <View className="flex-1 items-center justify-center rounded-2xl border border-dashed border-[#d1d5db] bg-[#f9fafb] p-12">
          <Text className="text-center text-[24px] font-extrabold text-[#111827]">
            Chưa có ca làm việc
          </Text>
          <Text className="mt-3 text-center text-[18px] font-medium text-[#6b7280]">
            Mở ca để xem báo cáo doanh thu.
          </Text>
        </View>
      )
    }

    if (error && !overview) {
      return (
        <View className="flex-1 items-center justify-center rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-12">
          <Text className="text-center text-[24px] font-extrabold text-[#991b1b]">
            Không tải được báo cáo
          </Text>
          <Text className="mt-3 text-center text-[18px] font-medium text-[#b91c1c]">
            {(error as Error)?.message || 'Vui lòng thử lại.'}
          </Text>
          <Pressable
            onPress={handleRetry}
            className="mt-7 rounded-xl bg-[#111827] px-10 py-4 active:opacity-80"
          >
            <Text className="text-[19px] font-bold text-white">Thử lại</Text>
          </Pressable>
        </View>
      )
    }

    return (
      <>
        <DashboardInfoBar staffId={staffId} overview={overview} isLoading={isLoading} />
        <DashboardStatsCards overview={overview} isLoading={isLoading} />

        <View className="h-[560px] min-h-[520px] flex-1 flex-row gap-6">
          <PaymentMethodsPanel overview={overview} isLoading={isLoading} />
          <ProductRevenuePanel staffId={staffId} shiftId={shiftId} />
        </View>
      </>
    )
  }, [shiftId, error, overview, isLoading, staffId, handleRetry])

  return (
    <View className="flex-1 bg-[#f3f4f6] py-2">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary.default]}
            tintColor={COLORS.primary.default}
          />
        }
      >
        <View className="flex-1 p-6">
          <View className="w-full flex-1 flex-col rounded-3xl border border-[#e2e8f0] bg-white p-8">
            <View className="mb-6 flex-row items-end justify-between">
              <View className="flex-col gap-2">
                <Text className="text-[32px] font-extrabold tracking-tight text-[#111827]">
                  Báo cáo doanh thu
                </Text>
                <Text className="text-[16px] font-medium text-[#6b7280]">
                  Tổng quan hoạt động và doanh thu trong ca làm việc.
                </Text>
              </View>

              <StaffSelect
                value={staffId}
                onChange={handleStaffChange}
                shiftId={shiftId}
                className="w-[280px]"
                triggerClassName="h-16"
                triggerTextClassName="text-[18px]"
              />
            </View>

            {body}
            {isFetching && overview && !refreshing ? (
              <Text className="mt-3 text-right text-[16px] font-bold text-[#9ca3af]">
                Đang cập nhật…
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default function DashboardScreen() {
  return <LazyTabShell Content={DashboardContent} skeleton={<DashboardSkeleton />} />
}
