import { EmptyState, LoadMore, Shimmer } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { getPaymentMethodStyle } from '@/shared/features/payment'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { Eye, PackageOpen } from 'lucide-react-native'
import React, { memo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useOrderFilterStore } from '../store'
import { IOrder } from '../types'
import { getOrderDisplayStatus } from '../utils'

interface OrderListProps {
  onOpenDetails: (order: IOrder) => void
  orders: IOrder[]
  isLoading: boolean
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

const getPaymentMethodInfo = (order: IOrder) => {
  const payments = order.paymentsSnapshot || []
  if (payments.length === 0) return { label: '—', color: COLORS.muted, bg: COLORS.surface[100] }
  if (payments.length >= 2) {
    return getPaymentMethodStyle('mix')
  }
  return getPaymentMethodStyle(payments[0].method)
}

const OrderSkeleton = () => (
  <View className="flex-row items-center border-b border-outline-variant px-8 py-6">
    <View className="mr-8 w-48">
      <Shimmer className="h-6 w-44 rounded-lg" />
    </View>
    <View className="mr-8 w-52">
      <Shimmer className="h-7 w-44 rounded-lg" />
    </View>
    <View className="mr-8 flex-1">
      <Shimmer className="h-6 w-64 rounded-lg" />
      <Shimmer className="mt-2 h-4 w-32 rounded-lg" />
    </View>
    <View className="mr-8 w-36 items-center">
      <Shimmer className="h-10 w-32 rounded-xl" />
    </View>
    <View className="mr-8 w-40">
      <Shimmer className="ml-auto h-8 w-32 rounded-lg" />
    </View>
    <View className="mr-8 w-52 items-center">
      <Shimmer className="h-8 w-28 rounded-full" />
    </View>
    <View className="w-12 items-end">
      <Shimmer className="h-10 w-10 rounded-xl" />
    </View>
  </View>
)

export const OrderList = memo(function OrderList({
  onOpenDetails,
  orders,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: OrderListProps) {
  const resetFilters = useOrderFilterStore((s) => s.resetFilters)

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
        const itemsSnap = item.itemsSnapshot || []
        const itemsCount = itemsSnap.length
        const firstItem = itemsSnap[0]
        const pttt = getPaymentMethodInfo(item)
        // Với đơn hoàn hàng (RT-), order.total là của đơn gốc → dùng refundAmount.
        // Đơn thường (SO-) dùng item.total vì đã bao gồm thuế.
        const displayTotal = item.refund ? item.refund.refundAmount : item.total
        const displayStatus = getOrderDisplayStatus(item)

        return (
          <Pressable
            onPress={() => onOpenDetails(item)}
            className="flex-row items-center border-b border-outline-variant px-8 py-7 active:bg-surface-100"
          >
            {/* Thời gian — ngày/tháng/năm · giờ:phút */}
            <View className="mr-8 w-48">
              <Text className="text-lg font-medium text-surface-on">
                {item.createdAt.toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
                {'  ·  '}
                {item.createdAt.toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {/* Mã Đơn */}
            <View className="mr-8 w-52">
              <Text
                className="text-xl font-black text-primary"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.code || item.id}
              </Text>
            </View>

            {/* Sản phẩm */}
            <View className="mr-8 flex-1">
              <Text className="text-lg font-bold text-surface-on" numberOfLines={1}>
                {firstItem?.name || 'Không có sản phẩm'}
              </Text>
              {itemsCount > 1 && (
                <Text className="mt-1 text-sm font-bold text-primary">
                  +{itemsCount - 1} sản phẩm khác
                </Text>
              )}
            </View>

            {/* Phương thức thanh toán */}
            <View className="mr-8 w-36 items-center">
              <View
                className="flex-row items-center gap-2 rounded-lg px-5 py-2.5"
                style={{ backgroundColor: pttt.bg }}
              >
                <Text
                  className="text-sm font-black uppercase tracking-tight"
                  style={{ color: pttt.color }}
                  numberOfLines={1}
                >
                  {pttt.label}
                </Text>
              </View>
            </View>

            {/* Tổng cộng */}
            <View className="mr-8 w-40">
              <Text className="text-right text-2xl font-black text-surface-on">
                {formatCurrency(displayTotal)}
              </Text>
            </View>

            {/* Trạng thái */}
            <View className="mr-8 w-52 items-center">
              <View
                className="rounded-full px-5 py-2"
                style={{ backgroundColor: displayStatus.bgColor }}
              >
                <Text
                  className="text-sm font-bold uppercase tracking-widest"
                  style={{ color: displayStatus.color }}
                  numberOfLines={1}
                >
                  {displayStatus.label}
                </Text>
              </View>
            </View>

            {/* Eye icon */}
            <View className="w-12 items-end">
              <View className="h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-surface-100">
                <Eye size={22} color={COLORS.surface.onVariant} />
              </View>
            </View>
          </Pressable>
        )
      }}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }}
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
