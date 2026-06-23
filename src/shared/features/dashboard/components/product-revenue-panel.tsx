import { Shimmer } from '@/shared/components/ui/shimmer'
import { useAppContext } from '@/shared/features/app'
import { formatCurrency } from '@/shared/utils'
import React from 'react'
import { FlatList, Text, View } from 'react-native'
import { useProductRevenue } from '../hooks'

interface ProductRevenuePanelProps {
  staffId?: string | null
}

export function ProductRevenuePanel({ staffId }: ProductRevenuePanelProps) {
  const { cashSessionId } = useAppContext()
  const { products, totalRevenue, totalItems, isLoading, isFetchingNextPage, hasMore, loadMore } =
    useProductRevenue(cashSessionId ?? undefined, staffId)

  if (isLoading) {
    return (
      <View
        style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
        className="flex-[2] flex-col justify-between overflow-hidden rounded-2xl border border-[#e5e7eb]/40"
      >
        <View className="w-full flex-1 flex-col">
          {/* Header */}
          <View className="px-6 py-5">
            <Text className="text-[18px] font-extrabold text-[#1f2937]">
              Chi tiết doanh thu theo sản phẩm
            </Text>
          </View>

          {/* Product Table Header */}
          <View className="flex-col px-6 pb-4">
            <View
              style={{ backgroundColor: 'rgba(235, 239, 244, 1)' }}
              className="flex-row rounded-xl px-4 py-3"
            >
              <View className="flex-[3] justify-center">
                <Text className="text-sm font-extrabold text-[#374151]">Sản phẩm</Text>
              </View>
              <View className="flex-[1.2] items-center justify-center">
                <Text className="text-sm font-extrabold text-[#374151]">Số lượng</Text>
              </View>
              <View className="flex-[2] items-end justify-center">
                <Text className="text-sm font-extrabold text-[#374151]">Số tiền</Text>
              </View>
            </View>

            {/* Shimmer Rows */}
            <View className="mt-3 gap-2">
              {[1, 2, 3, 4, 5].map((idx) => (
                <View
                  key={idx}
                  className="flex-row rounded-xl border border-[#e5e7eb]/30 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                >
                  <View className="flex-[3] justify-center">
                    <Shimmer className="h-5 w-40" />
                  </View>
                  <View className="flex-[1.2] items-center justify-center">
                    <Shimmer className="h-5 w-8" />
                  </View>
                  <View className="flex-[2] items-end justify-center">
                    <Shimmer className="h-5 w-24" />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Footer Shimmer */}
        <View
          style={{ backgroundColor: '#719BB0' }}
          className="flex-row items-center justify-between px-6 py-5"
        >
          <Text className="mr-4 text-lg font-bold text-white">Tổng doanh thu (đã VAT)</Text>
          <Shimmer className="h-8 w-36 bg-white/20" />
        </View>
      </View>
    )
  }

  // Compute overall total sum from the product revenue report rows
  const computedTotalRevenue = products.reduce((acc, curr) => acc + curr.total, 0)
  const displayTotalRevenue = totalRevenue ?? computedTotalRevenue

  const computedTotalItems = products.reduce((acc, curr) => acc + curr.qty, 0)
  const displayTotalItems = totalItems ?? computedTotalItems

  return (
    <View
      style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
      className="flex-[2] flex-col justify-between overflow-hidden rounded-2xl border border-[#e5e7eb]/40"
    >
      <View className="w-full flex-1 flex-col">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-5">
          <Text className="text-[18px] font-extrabold text-[#1f2937]">
            Chi tiết doanh thu theo sản phẩm
          </Text>
          {displayTotalItems !== undefined && (
            <Text className="text-[15px] font-bold text-[#4b5563]">
              Số lượng: {displayTotalItems}
            </Text>
          )}
        </View>

        {/* Product Table */}
        <View className="flex-1 flex-col px-6 pb-4">
          {/* Table Header Grid */}
          <View
            style={{ backgroundColor: 'rgba(235, 239, 244, 1)' }}
            className="flex-row rounded-xl px-4 py-3"
          >
            <View className="flex-[3] justify-center">
              <Text className="text-sm font-extrabold text-[#374151]">Sản phẩm</Text>
            </View>
            <View className="flex-[1.2] items-center justify-center">
              <Text className="text-sm font-extrabold text-[#374151]">Số lượng</Text>
            </View>
            <View className="flex-[2] items-end justify-center">
              <Text className="text-sm font-extrabold text-[#374151]">Số tiền</Text>
            </View>
          </View>

          {/* Table Rows (Scrollable list of 20 products occupying all remaining UI space) */}
          <View className="mt-3 flex-1">
            <FlatList
              data={products}
              nestedScrollEnabled={true}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ item }) => (
                <View className="mb-2 flex-row rounded-xl border border-[#e5e7eb]/30 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <View className="flex-[3] justify-center">
                    <Text className="text-[15px] font-extrabold text-[#111827]">{item.name}</Text>
                  </View>
                  <View className="flex-[1.2] items-center justify-center">
                    <Text className="text-[15px] font-bold text-[#374151]">{item.qty}</Text>
                  </View>
                  <View className="flex-[2] items-end justify-center">
                    <Text className="text-[15px] font-extrabold text-[#111827]">
                      {formatCurrency(item.total)}
                    </Text>
                  </View>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={true}
              onEndReached={() => {
                if (hasMore && !isFetchingNextPage) {
                  loadMore()
                }
              }}
              onEndReachedThreshold={0.2}
              ListFooterComponent={() => {
                if (!isFetchingNextPage) return null
                return (
                  <View className="items-center py-4">
                    <Shimmer className="h-6 w-32 rounded-lg" />
                  </View>
                )
              }}
            />
          </View>
        </View>
      </View>

      {/* Total Revenue Footer Bar */}
      <View
        style={{ backgroundColor: '#719BB0' }}
        className="flex-row items-center justify-between px-6 py-5"
      >
        <Text className="mr-4 text-lg font-bold text-white">Tổng doanh thu (đã VAT)</Text>
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          className="font-black text-white"
          style={{ fontSize: formatCurrency(displayTotalRevenue).length > 15 ? 18 : 24 }}
        >
          {formatCurrency(displayTotalRevenue)}
        </Text>
      </View>
    </View>
  )
}
