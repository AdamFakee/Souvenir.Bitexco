import { useAppContext } from '@/shared/features/app'
import { DashboardInfoBar } from '@/shared/features/dashboard/components/info-bar'
import { PaymentMethodsPanel } from '@/shared/features/dashboard/components/payment-methods-panel'
import { ProductRevenuePanel } from '@/shared/features/dashboard/components/product-revenue-panel'
import { DashboardStatsCards } from '@/shared/features/dashboard/components/stats-cards'
import { useDashboardOverview } from '@/shared/features/dashboard/hooks'
import { StaffSelect } from '@/shared/features/order/components/order-staff-select'
import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function DashboardScreen() {
  const { employee, cashSessionId } = useAppContext()
  // Default ngay từ employee — tránh 1 frame staffId=null → query key nhảy
  const [staffId, setStaffId] = useState<string | null>(() => employee?.id ?? null)

  const handleStaffChange = useCallback((id: string | null) => setStaffId(id), [])

  const shiftId = cashSessionId ?? undefined
  const { overview, isLoading, isFetching, error, refetch } = useDashboardOverview(shiftId, staffId)

  const body = useMemo(() => {
    if (!shiftId) {
      return (
        <View className="flex-1 items-center justify-center rounded-2xl border border-dashed border-[#d1d5db] bg-[#f9fafb] p-10">
          <Text className="text-center text-[20px] font-extrabold text-[#111827]">
            Chưa có ca làm việc
          </Text>
          <Text className="mt-2 text-center text-[15px] font-medium text-[#6b7280]">
            Mở ca để xem báo cáo doanh thu.
          </Text>
        </View>
      )
    }

    if (error && !overview) {
      return (
        <View className="flex-1 items-center justify-center rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-10">
          <Text className="text-center text-[20px] font-extrabold text-[#991b1b]">
            Không tải được báo cáo
          </Text>
          <Text className="mt-2 text-center text-[15px] font-medium text-[#b91c1c]">
            {(error as Error)?.message || 'Vui lòng thử lại.'}
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-6 rounded-xl bg-[#111827] px-8 py-3 active:opacity-80"
          >
            <Text className="text-[16px] font-bold text-white">Thử lại</Text>
          </Pressable>
        </View>
      )
    }

    return (
      <>
        <DashboardInfoBar staffId={staffId} overview={overview} isLoading={isLoading} />
        <DashboardStatsCards overview={overview} isLoading={isLoading} />

        <View className="flex-1 flex-row gap-6">
          <PaymentMethodsPanel overview={overview} isLoading={isLoading} />
          <ProductRevenuePanel staffId={staffId} shiftId={shiftId} />
        </View>

        {isFetching && overview ? (
          <Text className="mt-2 text-right text-[13px] font-bold text-[#9ca3af]">
            Đang cập nhật…
          </Text>
        ) : null}
      </>
    )
  }, [shiftId, error, overview, isLoading, isFetching, staffId, refetch])

  return (
    <SafeAreaView className="flex-1 bg-[#f3f4f6]">
      <View className="flex-1 p-6">
        <View className="w-full flex-1 flex-col rounded-3xl border border-[#e2e8f0] bg-white p-8">
          <View className="mb-6 flex-row items-end justify-between">
            <View className="flex-col gap-2">
              <Text className="text-[32px] font-extrabold tracking-tight text-[#111827]">
                Báo cáo doanh thu ca hiện tại
              </Text>
              <Text className="text-[16px] font-medium text-[#6b7280]">
                Tổng quan hoạt động và doanh thu trong ca làm việc.
              </Text>
            </View>

            <StaffSelect
              value={staffId}
              onChange={handleStaffChange}
              shiftId={shiftId}
              className="w-72"
            />
          </View>

          {body}
        </View>
      </View>
    </SafeAreaView>
  )
}
