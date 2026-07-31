import { Shimmer } from '@/shared/components/ui/shimmer'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import React, { memo, useCallback } from 'react'
import { Text, View } from 'react-native'
import { useProductRevenue } from '../hooks'

interface ProductRevenuePanelProps {
  staffId?: string | null
  shiftId?: string
}

const ProductRow = memo(function ProductRow({
  name,
  qty,
  total,
}: {
  name: string
  qty: number
  total: number
}) {
  return (
    <View className="mb-3 flex-row rounded-xl border border-[#e5e7eb]/30 bg-white px-5 py-5">
      <View className="flex-[3] justify-center">
        <Text className="text-[18px] font-extrabold text-[#111827]" numberOfLines={2}>
          {name}
        </Text>
      </View>
      <View className="flex-[1.2] items-center justify-center">
        <Text className="text-[18px] font-bold text-[#374151]">{qty}</Text>
      </View>
      <View className="flex-[2] items-end justify-center">
        <Text className="text-[18px] font-extrabold text-[#111827]">{formatCurrency(total)}</Text>
      </View>
    </View>
  )
})

export const ProductRevenuePanel = memo(function ProductRevenuePanel({
  staffId,
  shiftId,
}: ProductRevenuePanelProps) {
  const { products, totalRevenue, totalItems, isLoading, isFetchingNextPage, hasMore, loadMore } =
    useProductRevenue(shiftId, staffId)

  const renderItem = useCallback(
    ({ item }: { item: { name: string; qty: number; total: number } }) => (
      <ProductRow name={item.name} qty={item.qty} total={item.total} />
    ),
    [],
  )

  const keyExtractor = useCallback(
    (item: { name: string; sku?: string }, idx: number) => item.sku || `${item.name}-${idx}`,
    [],
  )

  const onEndReached = useCallback(() => {
    if (hasMore && !isFetchingNextPage) loadMore()
  }, [hasMore, isFetchingNextPage, loadMore])

  if (isLoading) {
    return (
      <View
        style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
        className="flex-[2] flex-col justify-between overflow-hidden rounded-2xl border border-[#e5e7eb]/40"
      >
        <View className="w-full flex-1 flex-col">
          <View className="px-8 py-6">
            <Text className="text-[22px] font-extrabold text-[#1f2937]">
              Chi tiết doanh thu theo sản phẩm
            </Text>
          </View>
          <View className="flex-col px-8 pb-4">
            <View
              style={{ backgroundColor: 'rgba(235, 239, 244, 1)' }}
              className="flex-row rounded-xl px-5 py-4"
            >
              <View className="flex-[3] justify-center">
                <Text className="text-[17px] font-extrabold text-[#374151]">Sản phẩm</Text>
              </View>
              <View className="flex-[1.2] items-center justify-center">
                <Text className="text-[17px] font-extrabold text-[#374151]">Số lượng</Text>
              </View>
              <View className="flex-[2] items-end justify-center">
                <Text className="text-[17px] font-extrabold text-[#374151]">Số tiền</Text>
              </View>
            </View>
            <View className="mt-3 gap-2">
              {[1, 2, 3, 4, 5].map((idx) => (
                <View
                  key={idx}
                  className="flex-row rounded-xl border border-[#e5e7eb]/30 bg-white px-5 py-5"
                >
                  <View className="flex-[3] justify-center">
                    <Shimmer className="h-6 w-48" />
                  </View>
                  <View className="flex-[1.2] items-center justify-center">
                    <Shimmer className="h-6 w-10" />
                  </View>
                  <View className="flex-[2] items-end justify-center">
                    <Shimmer className="w-30 h-6" />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View
          style={{ backgroundColor: '#719BB0' }}
          className="flex-row items-center justify-between px-8 py-6"
        >
          <Text className="mr-4 text-[22px] font-bold text-white">Tổng doanh thu (đã VAT)</Text>
          <Shimmer className="h-9 w-44 bg-white/20" />
        </View>
      </View>
    )
  }

  const displayTotalRevenue = totalRevenue ?? products.reduce((acc, curr) => acc + curr.total, 0)
  const displayTotalItems = totalItems ?? products.reduce((acc, curr) => acc + curr.qty, 0)

  return (
    <View
      style={{ backgroundColor: 'rgba(230, 239, 243, 0.44)' }}
      className="flex-[2] flex-col justify-between overflow-hidden rounded-2xl border border-[#e5e7eb]/40"
    >
      <View className="w-full flex-1 flex-col">
        <View className="flex-row items-center justify-between px-8 py-6">
          <Text className="text-[22px] font-extrabold text-[#1f2937]">
            Chi tiết doanh thu theo sản phẩm
          </Text>
          <Text className="text-[18px] font-bold text-[#4b5563]">
            Số lượng: {displayTotalItems}
          </Text>
        </View>

        <View className="flex-1 flex-col px-8 pb-4">
          <View
            style={{ backgroundColor: 'rgba(235, 239, 244, 1)' }}
            className="flex-row rounded-xl px-5 py-4"
          >
            <View className="flex-[3] justify-center">
              <Text className="text-[17px] font-extrabold text-[#374151]">Sản phẩm</Text>
            </View>
            <View className="flex-[1.2] items-center justify-center">
              <Text className="text-[17px] font-extrabold text-[#374151]">Số lượng</Text>
            </View>
            <View className="flex-[2] items-end justify-center">
              <Text className="text-[17px] font-extrabold text-[#374151]">Số tiền</Text>
            </View>
          </View>

          <View className="mt-3 flex-1">
            <FlashList
              data={products}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.2}
              contentContainerStyle={{ paddingBottom: 16 }}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View className="items-center py-4">
                    <Shimmer className="h-6 w-32 rounded-lg" />
                  </View>
                ) : null
              }
            />
          </View>
        </View>
      </View>

      <View
        style={{ backgroundColor: '#719BB0' }}
        className="flex-row items-center justify-between px-8 py-6"
      >
        <Text className="mr-4 text-[22px] font-bold text-white">Tổng doanh thu (đã VAT)</Text>
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          className="font-black text-white"
          style={{ fontSize: formatCurrency(displayTotalRevenue).length > 15 ? 22 : 29 }}
        >
          {formatCurrency(displayTotalRevenue)}
        </Text>
      </View>
    </View>
  )
})
