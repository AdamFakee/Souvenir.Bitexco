import { Shimmer } from '@/shared/components/ui/shimmer'
import React, { memo } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-[#f3f4f6]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 p-6">
          <View className="w-full flex-1 flex-col rounded-3xl border border-[#e2e8f0] bg-white p-8">
            {/* ─── Header ─── */}
            <View className="pointer-events-none mb-6 flex-row items-end justify-between opacity-60">
              <View className="flex-col gap-2">
                <Text className="text-[32px] font-extrabold tracking-tight text-[#111827]">
                  Báo cáo doanh thu
                </Text>
                <Text className="text-[16px] font-medium text-[#6b7280]">
                  Tổng quan hoạt động và doanh thu trong ca làm việc.
                </Text>
              </View>
              <Shimmer className="h-16 w-[280px] rounded-xl" />
            </View>

            {/* ─── Info Bar ─── */}
            <View className="mb-6 flex-row items-center justify-between rounded-2xl border border-neutral-100 bg-[#f9fafb] px-6 py-5">
              <View className="flex-row items-center gap-4">
                <Shimmer className="h-16 w-16 rounded-full" />
                <View className="flex-col gap-2">
                  <Shimmer className="h-6 w-40 rounded" />
                  <Shimmer className="h-4 w-28 rounded" />
                </View>
              </View>
              <View className="flex-col items-end gap-2">
                <Shimmer className="h-4 w-28 rounded" />
                <Shimmer className="h-5 w-20 rounded" />
              </View>
            </View>

            {/* ─── Stats Cards (4 items) ─── */}
            <View className="mb-6 flex-row gap-5">
              {[1, 2, 3, 4].map((idx) => (
                <View
                  key={idx}
                  style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
                  className="relative min-h-[128px] flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-[#e5e7eb]/40 p-6"
                >
                  <Shimmer className="h-4 w-24 rounded" />
                  <Shimmer className="mt-2 h-9 w-36 rounded" />
                  <View className="absolute bottom-5 right-6">
                    <Shimmer className="h-12 w-12 rounded-full" />
                  </View>
                </View>
              ))}
            </View>

            {/* ─── Bottom Panels (Payment Methods + Top Products) ─── */}
            <View className="flex-1 flex-row gap-6">
              {/* Left Panel: Payment Methods */}
              <View className="w-[420px] rounded-2xl border border-[#e5e7eb] p-6">
                <Shimmer className="h-6 w-48 rounded" />
                <View className="my-auto items-center justify-center py-4">
                  <Shimmer
                    style={{ borderRadius: 120 }}
                    className="h-[240px] w-[240px] items-center justify-center rounded-full"
                  >
                    <View className="h-[160px] w-[160px] items-center justify-center rounded-full bg-white">
                      <Shimmer className="h-6 w-28 rounded" />
                      <Shimmer className="mt-2 h-4 w-16 rounded" />
                    </View>
                  </Shimmer>
                </View>
                <View className="gap-2.5">
                  <Shimmer className="h-4 w-full rounded" />
                  <Shimmer className="h-4 w-3/4 rounded" />
                </View>
              </View>

              {/* Right Panel: Top Products Revenue */}
              <View className="flex-1 rounded-2xl border border-[#e5e7eb] p-6">
                <View className="mb-5 flex-row items-center justify-between">
                  <Shimmer className="h-6 w-52 rounded" />
                  <Shimmer className="h-5 w-24 rounded" />
                </View>

                <View className="flex-1 gap-4">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <View
                      key={idx}
                      className="flex-row items-center justify-between border-b border-surface-100 pb-3.5"
                    >
                      <View className="flex-row items-center gap-3">
                        <Shimmer className="h-7 w-7 rounded-full" />
                        <View className="gap-1.5">
                          <Shimmer className="h-4.5 w-48 rounded" />
                          <Shimmer className="h-3.5 w-28 rounded opacity-60" />
                        </View>
                      </View>
                      <Shimmer className="h-5 w-24 rounded" />
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
})
