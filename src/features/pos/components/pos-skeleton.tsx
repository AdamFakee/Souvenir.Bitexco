import { Shimmer } from '@/shared/components/ui/shimmer'
import React, { memo } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export const PosSkeleton = memo(function PosSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right', 'bottom']}>
      <View className="flex-1 flex-col gap-3" style={{ zIndex: 1 }}>
        {/* ─── Cart Section ─── */}
        <View
          className="flex-1 overflow-hidden rounded-[12px] bg-white"
          style={{
            shadowColor: '#A8A8A8',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          {/* Tabs Bar */}
          <View className="flex-row items-center border-b border-surface-100 bg-white px-5 py-4">
            <View className="flex-1 flex-row items-center gap-3">
              <Shimmer className="h-[48px] w-36 rounded-full" />
              <Shimmer className="h-[48px] w-36 rounded-full opacity-60" />
            </View>
            <Shimmer className="h-[54px] w-40 rounded-full" />
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center border-b border-surface-100 bg-white px-6 py-4">
            <Shimmer className="h-[52px] flex-1 rounded-xl" />
          </View>

          {/* Table Header */}
          <View className="flex-row items-center border-b border-surface-200 bg-surface-50 px-6 py-4">
            <Shimmer className="h-6 w-[100px] rounded" />
            <Shimmer className="ml-8 h-6 flex-1 rounded" />
            <Shimmer className="h-6 w-[140px] rounded" />
            <Shimmer className="ml-6 h-6 w-[70px] rounded" />
            <Shimmer className="ml-6 h-6 w-[160px] rounded" />
            <Shimmer className="ml-6 h-6 w-[160px] rounded" />
            <View className="w-16" />
          </View>

          {/* Table Rows */}
          <View className="flex-1 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                className="flex-row items-center border-b border-surface-100 bg-white px-6 py-5"
              >
                <View className="w-[140px]">
                  <Shimmer className="h-6 w-8 rounded" />
                </View>
                <View className="flex-1 pr-4">
                  <Shimmer className="h-6 w-[60%] rounded" />
                  <Shimmer className="mt-2 h-4 w-[35%] rounded" />
                </View>
                <View className="w-[180px] items-center">
                  <Shimmer className="h-6 w-24 rounded" />
                </View>
                <View className="w-[100px] items-center">
                  <Shimmer className="h-6 w-12 rounded" />
                </View>
                <View className="w-[220px] items-center">
                  <Shimmer className="h-10 w-32 rounded-xl" />
                </View>
                <View className="w-[220px] items-end pr-4">
                  <Shimmer className="h-7 w-28 rounded" />
                </View>
                <View className="w-16 items-center">
                  <Shimmer className="h-10 w-10 rounded-lg" />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Checkout Section ─── */}
        <View className="w-full rounded-2xl border border-outline-variant bg-white p-4 shadow-sm">
          <View className="flex-row items-stretch gap-3">
            {/* Col 1: Customer info / Note / Voucher */}
            <View className="w-2/5 gap-3">
              <Shimmer className="h-[96px] w-full rounded-xl" />
              <Shimmer className="h-[64px] w-full rounded-xl" />
              <Shimmer className="h-[64px] w-full rounded-xl" />
            </View>

            {/* Col 2: Order Summary */}
            <View className="flex-1 justify-between rounded-2xl border border-outline-variant bg-surface-50 p-6">
              <View className="gap-3.5">
                <View className="flex-row justify-between">
                  <Shimmer className="h-5 w-24 rounded" />
                  <Shimmer className="h-5 w-12 rounded" />
                </View>
                <View className="flex-row justify-between">
                  <Shimmer className="h-5 w-24 rounded" />
                  <Shimmer className="h-5 w-28 rounded" />
                </View>
                <View className="flex-row justify-between">
                  <Shimmer className="h-5 w-16 rounded" />
                  <Shimmer className="h-5 w-20 rounded" />
                </View>
                <View className="flex-row justify-between">
                  <Shimmer className="h-5 w-24 rounded" />
                  <Shimmer className="h-5 w-24 rounded" />
                </View>
              </View>

              <View className="mt-4 flex-row items-center justify-between border-t border-outline-variant pt-4">
                <Shimmer className="h-7 w-28 rounded" />
                <Shimmer className="h-9 w-36 rounded" />
              </View>
            </View>

            {/* Col 3: Payment Method Buttons (2x2 Grid) */}
            <View className="w-[430px] justify-end gap-3">
              <View className="flex-row gap-4">
                <Shimmer className="min-h-[86px] flex-1 rounded-2xl" />
                <Shimmer className="min-h-[86px] flex-1 rounded-2xl" />
              </View>
              <View className="flex-row gap-4">
                <Shimmer className="min-h-[86px] flex-1 rounded-2xl" />
                <Shimmer className="min-h-[86px] flex-1 rounded-2xl" />
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
})
