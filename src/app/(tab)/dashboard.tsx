import { useAppContext } from '@/shared/features/app'
import { DashboardInfoBar } from '@/shared/features/dashboard/components/info-bar'
import { PaymentMethodsPanel } from '@/shared/features/dashboard/components/payment-methods-panel'
import { ProductRevenuePanel } from '@/shared/features/dashboard/components/product-revenue-panel'
import { DashboardStatsCards } from '@/shared/features/dashboard/components/stats-cards'
import { StaffSelect } from '@/shared/features/order/components/order-staff-select'
import React, { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

let lastDashboardEmployeeId: string | null = null

export default function DashboardScreen() {
  const { employee, cashSessionId } = useAppContext()
  const [staffId, setStaffId] = useState<string | null>(null)

  useEffect(() => {
    if (employee?.id && lastDashboardEmployeeId !== employee.id) {
      setStaffId(employee.id)
      lastDashboardEmployeeId = employee.id
    }
  }, [employee?.id])

  const handleStaffChange = useCallback((id: string | null) => setStaffId(id), [])

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
              shiftId={cashSessionId ?? undefined}
              className="w-72"
            />
          </View>

          <DashboardInfoBar staffId={staffId} />
          <DashboardStatsCards staffId={staffId} />

          <View className="flex-1 flex-row gap-6">
            <PaymentMethodsPanel staffId={staffId} />
            <ProductRevenuePanel staffId={staffId} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
