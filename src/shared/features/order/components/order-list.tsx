import { EmptyState, LoadMore, Shimmer } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { OrderModel } from '@/shared/lib/database'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { Eye, PackageOpen } from 'lucide-react-native'
import React, { memo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ORDER_STATUS_CONFIG } from '../constants'
import { useOrders } from '../hooks'
import { useOrderFilterStore } from '../store'

interface OrderListProps {
  onOpenDetails: (order: OrderModel) => void
}

const getPaymentMethodInfo = (order: OrderModel) => {
  const payments = order.paymentsSnapshot || []
  if (payments.length === 0) return { label: '—', color: COLORS.muted, bg: COLORS.surface[100] }

  const method = payments[0].method.toUpperCase()
  switch (method) {
    case 'CASH':
      return { label: 'Tiền mặt', color: COLORS.success.onContainer, bg: COLORS.success.container }
    case 'CARD':
      return { label: 'Thẻ POS', color: COLORS.warning.onContainer, bg: COLORS.warning.container }
    case 'QR':
      return {
        label: 'Chuyển khoản',
        color: COLORS.primary.onFixedVariant,
        bg: COLORS.primary.fixed,
      }
    default:
      return { label: method, color: COLORS.muted, bg: COLORS.surface[100] }
  }
}

const OrderSkeleton = () => (
  <View className="flex-row items-center border-b border-outline-variant px-8 py-6">
    <View className="mr-6 w-44">
      <Shimmer className="h-7 w-32 rounded-lg" />
    </View>
    <View className="mr-6 w-44">
      <Shimmer className="h-6 w-36 rounded-lg" />
    </View>
    <View className="mr-6 flex-1">
      <Shimmer className="h-6 w-48 rounded-lg" />
      <Shimmer className="mt-2 h-4 w-24 rounded-lg" />
    </View>
    <View className="mr-6 w-44 items-center">
      <Shimmer className="h-10 w-32 rounded-xl" />
    </View>
    <View className="mr-6 w-40">
      <Shimmer className="ml-auto h-8 w-28 rounded-lg" />
    </View>
    <View className="mr-6 w-36 items-center">
      <Shimmer className="h-8 w-28 rounded-full" />
    </View>
    <View className="w-16 items-end">
      <Shimmer className="h-10 w-10 rounded-xl" />
    </View>
  </View>
)

export const OrderList = memo(function OrderList({ onOpenDetails }: OrderListProps) {
  const { status, searchQuery, dateFrom, dateTo, resetFilters } = useOrderFilterStore()

  const { orders, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders({
    status,
    searchQuery,
    dateFrom,
    dateTo,
  })

  if (isLoading) {
    return (
      <View className="flex-1">
        {[...Array(8)].map((_, i) => (
          <OrderSkeleton key={i} />
        ))}
      </View>
    )
  }

  return (
    <FlashList
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const itemsCount = item.itemsSnapshot?.length || 0
        const firstItem = item.itemsSnapshot?.[0]
        const pttt = getPaymentMethodInfo(item)
        const config = ORDER_STATUS_CONFIG[item.status]

        return (
          <Pressable
            onPress={() => onOpenDetails(item)}
            className="flex-row items-center border-b border-outline-variant px-8 py-6 active:bg-surface-100"
          >
            <View className="mr-6 w-44">
              <Text
                className="text-lg font-black text-primary"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.id}
              </Text>
            </View>

            <Text className="mr-6 w-44 text-base font-medium text-surface-on">
              {item.createdAt.toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>

            <View className="mr-6 flex-1">
              <Text className="text-base font-bold text-surface-on" numberOfLines={1}>
                {firstItem?.name || 'Không có sản phẩm'}
              </Text>
              {itemsCount > 1 && (
                <Text className="mt-1 text-xs font-bold text-primary">
                  +{itemsCount - 1} sản phẩm khác
                </Text>
              )}
            </View>

            <View className="mr-6 w-44 items-center">
              <View
                className="flex-row items-center gap-2 rounded-lg px-4 py-2"
                style={{ backgroundColor: pttt.bg }}
              >
                <Text
                  className="text-sm font-black uppercase tracking-tight"
                  style={{ color: pttt.color }}
                >
                  {pttt.label}
                </Text>
              </View>
            </View>

            <View className="mr-6 w-40">
              <Text className="text-right text-xl font-black text-surface-on">
                {formatCurrency(item.total)}
              </Text>
            </View>

            <View className="mr-6 w-36 items-center">
              <View
                className="rounded-full px-4 py-1.5"
                style={{ backgroundColor: config.bgColor }}
              >
                <Text
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: config.color }}
                >
                  {config.label}
                </Text>
              </View>
            </View>

            <View className="w-16 items-end">
              <View className="h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-surface-100">
                <Eye size={20} color={COLORS.surface.onVariant} />
              </View>
            </View>
          </Pressable>
        )
      }}
      onEndReached={fetchNextPage}
      onEndReachedThreshold={0.5}
      ListFooterComponent={<LoadMore isLoading={isFetchingNextPage} />}
      ListEmptyComponent={
        <EmptyState
          title="Danh sách trống"
          description="Chúng tôi không tìm thấy đơn hàng nào khớp với bộ lọc hiện tại của bạn."
          icon={PackageOpen}
          actionLabel="Xóa bộ lọc"
          onAction={resetFilters}
        />
      }
    />
  )
})
