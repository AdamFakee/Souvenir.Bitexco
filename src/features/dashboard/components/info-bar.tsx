import { Shimmer } from '@/shared/components/ui/shimmer'
import { formatShiftStartDisplay } from '@/shared/utils/date-format'
import { Users } from 'lucide-react-native'
import React, { memo } from 'react'
import { Text, View } from 'react-native'
import type { DashboardOverviewResponse } from '../types'

interface DashboardInfoBarProps {
  staffId?: string | null
  overview: DashboardOverviewResponse | null
  isLoading: boolean
}

export const DashboardInfoBar = memo(function DashboardInfoBar({
  staffId,
  overview,
  isLoading,
}: DashboardInfoBarProps) {
  // Chỉ shimmer khi đang load lần đầu — không kẹt khi overview null sau error
  if (isLoading) {
    return (
      <View className="mb-6 flex-row items-center justify-between rounded-2xl border border-neutral-100 bg-[#f9fafb] px-6 py-5">
        <View className="flex-row items-center gap-4">
          <Shimmer className="h-16 w-16 rounded-full" />
          <View className="flex-col gap-2">
            <Shimmer className="h-6 w-36" />
            <Shimmer className="h-4 w-24" />
          </View>
        </View>
        <View className="flex-col items-center gap-2">
          <Shimmer className="h-4 w-20" />
          <Shimmer className="h-5 w-28" />
        </View>
        <View className="flex-col items-end gap-2">
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-5 w-16" />
        </View>
      </View>
    )
  }

  if (!overview) return null

  const isAllStaff = !staffId

  return (
    <View className="mb-6 flex-row items-center justify-between rounded-2xl border border-neutral-100 bg-[#f9fafb] px-6 py-5">
      <View className="flex-row items-center gap-4">
        {isAllStaff ? (
          <View
            style={{ backgroundColor: 'rgba(0, 125, 85, 0.1)' }}
            className="h-16 w-16 items-center justify-center rounded-full"
          >
            <Users size={28} color="#007D55" />
          </View>
        ) : (
          <View className="relative h-16 w-16 items-center justify-center rounded-full bg-[#f3f4f6]">
            <Text className="text-2xl font-black text-[#111827]">
              {overview.employeeName ? overview.employeeName.charAt(0).toUpperCase() : 'U'}
            </Text>
            <View className="absolute bottom-0 right-0 h-[16px] w-[16px] rounded-full border-2 border-white bg-green-500" />
          </View>
        )}
        <View className="flex-col">
          <Text className="text-[22px] font-black leading-tight text-[#111827]">
            {isAllStaff ? 'Tất cả nhân viên' : overview.employeeName}
          </Text>
          <Text className="mt-0.5 text-[15px] font-bold text-[#6b7280]">
            {isAllStaff ? 'Báo cáo tổng hợp ca' : `Mã NV: ${overview.employeeCode}`}
          </Text>
        </View>
      </View>

      <View className="flex-col items-end">
        <Text className="text-[13px] font-extrabold uppercase tracking-widest text-[#6b7280]">
          Thời gian vào ca
        </Text>
        <Text className="mt-1.5 text-lg font-black text-[#111827]">
          {formatShiftStartDisplay(overview.shiftStart)}
        </Text>
      </View>
    </View>
  )
})
