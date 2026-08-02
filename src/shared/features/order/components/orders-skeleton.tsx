import { Shimmer } from '@/shared/components/ui/shimmer'
import React, { memo } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export const OrdersSkeleton = memo(function OrdersSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 bg-white">
        {/* ─── Top Tabs ─── */}
        <View className="flex-row gap-2 px-4 pt-3">
          <View
            className="items-center justify-center rounded-t-2xl bg-surface-variant px-10 py-5"
            style={{
              shadowColor: '#DBDBDB',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.24,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <Shimmer className="h-6 w-20 rounded" />
          </View>
          <View className="items-center justify-center rounded-t-2xl bg-neutral-50 px-10 py-5">
            <Shimmer className="h-6 w-24 rounded opacity-50" />
          </View>
          <View className="items-center justify-center rounded-t-2xl bg-neutral-50 px-10 py-5">
            <Shimmer className="h-6 w-32 rounded opacity-50" />
          </View>
          <View className="items-center justify-center rounded-t-2xl bg-neutral-50 px-10 py-5">
            <Shimmer className="h-6 w-20 rounded opacity-50" />
          </View>
        </View>

        {/* ─── Main Content Box ─── */}
        <View
          className="flex-1 rounded-b-xl rounded-tr-xl px-5 pb-5 pt-4"
          style={{
            backgroundColor: '#fff',
            shadowColor: '#A8A8A8',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 32,
            elevation: 4,
          }}
        >
          {/* Filter Bar */}
          <View className="mb-4 flex-row items-center gap-3">
            <Shimmer className="h-[64px] flex-1 rounded-xl" />
            <Shimmer className="h-[64px] w-[340px] rounded-xl" />
            <Shimmer className="h-[64px] w-60 rounded-xl" />
          </View>

          {/* Table Container */}
          <View className="flex-1 rounded-lg border border-outline">
            {/* Table Header */}
            <View className="flex-row items-center border-b border-outline bg-surface-50 px-4 py-4">
              <View className="flex-1">
                <Shimmer className="h-5 w-28 rounded" />
              </View>
              <View className="flex-1">
                <Shimmer className="h-5 w-32 rounded" />
              </View>
              <View className="flex-1">
                <Shimmer className="h-5 w-28 rounded" />
              </View>
              <View className="flex-[0.7]">
                <Shimmer className="h-5 w-16 rounded" />
              </View>
              <View className="flex-[0.8]">
                <Shimmer className="h-5 w-20 rounded" />
              </View>
              <View className="flex-[0.8]">
                <Shimmer className="h-5 w-24 rounded" />
              </View>
              <View className="flex-[0.7] items-center">
                <Shimmer className="h-5 w-20 rounded" />
              </View>
            </View>

            {/* Table Rows */}
            <View className="flex-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View
                  key={i}
                  className="flex-row items-center border-b border-surface-100 px-4 py-4"
                  style={{ backgroundColor: i % 2 === 0 ? '#FAFAFB' : '#FFFFFF' }}
                >
                  <View className="flex-1 pr-2">
                    <Shimmer className="h-5 w-32 rounded" />
                    <Shimmer className="mt-1.5 h-3.5 w-20 rounded opacity-60" />
                  </View>
                  <View className="flex-1 pr-2">
                    <Shimmer className="h-5 w-36 rounded" />
                    <Shimmer className="mt-1.5 h-3.5 w-24 rounded opacity-60" />
                  </View>
                  <View className="flex-1">
                    <Shimmer className="h-5 w-32 rounded" />
                  </View>
                  <View className="flex-[0.7]">
                    <Shimmer className="h-7 w-20 rounded-full" />
                  </View>
                  <View className="flex-[0.8]">
                    <Shimmer className="h-5 w-24 rounded" />
                  </View>
                  <View className="flex-[0.8]">
                    <Shimmer className="h-7 w-28 rounded-full" />
                  </View>
                  <View className="flex-[0.7] flex-row items-center justify-center gap-2">
                    <Shimmer className="h-9 w-9 rounded-lg" />
                    <Shimmer className="h-9 w-9 rounded-lg" />
                  </View>
                </View>
              ))}
            </View>

            {/* Stats Footer */}
            <View
              className="flex-row items-center border-t px-6 py-5"
              style={{ borderColor: '#DFE0E1', backgroundColor: '#FAFAFB' }}
            >
              <View className="flex-row items-center gap-6">
                <View className="flex-row items-baseline gap-2">
                  <Shimmer className="h-5 w-20 rounded" />
                  <Shimmer className="h-6 w-12 rounded" />
                </View>
                <View className="h-6 w-px bg-neutral-200" />
                <View className="flex-row items-baseline gap-2">
                  <Shimmer className="h-5 w-20 rounded" />
                  <Shimmer className="h-6 w-12 rounded" />
                </View>
              </View>

              <View className="flex-1" />

              <View className="flex-row items-baseline gap-2">
                <Shimmer className="h-5 w-32 rounded" />
                <Shimmer className="h-7 w-40 rounded" />
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
})
