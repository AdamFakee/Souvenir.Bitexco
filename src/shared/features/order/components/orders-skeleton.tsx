import { ChevronDown, Search } from 'lucide-react-native'
import React, { memo } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const MockModeTabs = memo(function MockModeTabs() {
  return (
    <View className="pointer-events-none flex-row gap-2 px-4 pt-3 opacity-60">
      {['Tất cả', 'Khách lẻ', 'Cộng tác viên', 'Đối tác'].map((label, idx) => (
        <View
          key={idx}
          className={`items-center justify-center rounded-t-2xl px-10 py-5 ${
            idx === 0 ? 'elevation-8 bg-surface-variant' : 'elevation-0 bg-neutral-50'
          }`}
        >
          <Text
            className={`font-manrope-bold text-[22px] font-black ${
              idx === 0 ? 'text-primary' : 'text-neutral-900'
            }`}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  )
})

const MockFilterBar = memo(function MockFilterBar() {
  return (
    <View className="pointer-events-none mb-4 flex-row items-center gap-3 opacity-50">
      <View className="h-[64px] flex-1 flex-row items-center rounded-xl border border-outline-variant bg-white px-4">
        <Search size={24} color="#8d8e8f" />
        <Text className="ml-3 text-[18px] text-muted">Tìm kiếm đơn hàng...</Text>
      </View>
      <View className="h-[64px] w-[340px] flex-row items-center justify-between rounded-xl border border-outline-variant bg-white px-4">
        <Text className="text-[20px] font-bold text-surface-on">Hôm nay</Text>
        <ChevronDown size={20} color="#8d8e8f" />
      </View>
      <View className="h-[64px] w-60 flex-row items-center justify-between rounded-xl border border-outline-variant bg-white px-4">
        <Text className="text-[20px] font-bold text-surface-on">Tất cả nhân viên</Text>
        <ChevronDown size={20} color="#8d8e8f" />
      </View>
    </View>
  )
})

const MockTableHeader = memo(function MockTableHeader() {
  return (
    <View
      className="flex-row items-center border-b border-outline bg-white px-4"
      style={{ height: 64 }}
    >
      <View className="h-6 w-10 rounded bg-neutral-200" />
      <View className="ml-4 flex-1 flex-row gap-2">
        {[2, 3, 2, 2, 2, 2, 2].map((flex, i) => (
          <View key={i} style={{ flex }}>
            <View className="h-5 w-20 rounded bg-neutral-200" />
          </View>
        ))}
      </View>
    </View>
  )
})

const MockRow = memo(function MockRow() {
  return (
    <View
      className="flex-row items-center border-b border-outline bg-white px-4"
      style={{ minHeight: 62, paddingVertical: 8 }}
    >
      <View className="h-10 w-10 rounded-full bg-neutral-200" />
      <View className="ml-4 flex-1 flex-row items-center gap-2" style={{ height: 60 }}>
        {[2, 3, 2, 2, 2, 2, 2].map((flex, i) => (
          <View key={i} style={{ flex }}>
            <View className="h-4 w-20 rounded bg-neutral-200" />
            <View className="mt-2 h-3 w-16 rounded bg-neutral-200" />
          </View>
        ))}
      </View>
    </View>
  )
})

export const OrdersSkeleton = memo(function OrdersSkeleton() {
  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 bg-white">
        <MockModeTabs />

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
          <MockFilterBar />

          <View className="flex-1 rounded-lg border border-outline">
            <MockTableHeader />

            <View className="flex-1 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <MockRow key={i} />
              ))}
            </View>

            <View className="pointer-events-none flex-row items-center justify-between border-t border-outline bg-surface-50 px-6 py-5 opacity-60">
              <View className="h-8 w-32 rounded bg-neutral-200" />
              <View className="flex-row items-center gap-6">
                <View className="h-8 w-24 rounded bg-neutral-200" />
                <View className="h-8 w-32 rounded bg-neutral-200" />
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
})
