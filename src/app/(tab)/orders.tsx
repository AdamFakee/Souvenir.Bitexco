import {
  IOrder,
  OrderDetailModal,
  OrderDetailModalRef,
  OrderFilterBar,
  OrderList,
  OrderStatsFooter,
  OrderStatusTabs,
  useOrderFilterStore,
} from '@/shared/features/order'
import { useOrders } from '@/shared/features/order/hooks'
import React, { useDeferredValue, useRef } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function OrdersScreen() {
  const modalRef = useRef<OrderDetailModalRef>(null)

  const status = useOrderFilterStore((s) => s.status)
  const searchQuery = useOrderFilterStore((s) => s.searchQuery)
  const dateFrom = useOrderFilterStore((s) => s.dateFrom)
  const dateTo = useOrderFilterStore((s) => s.dateTo)
  const staffId = useOrderFilterStore((s) => s.staffId)

  // Defer ALL filter values so every visual update (tab highlight, toggle, etc.)
  // is instant while the heavy network fetch is deferred as low-priority work
  const deferredStatus = useDeferredValue(status)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const deferredStaffId = useDeferredValue(staffId)
  const deferredDateFrom = useDeferredValue(dateFrom)
  const deferredDateTo = useDeferredValue(dateTo)

  const { orders, stats, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders({
    status: deferredStatus,
    searchQuery: deferredSearchQuery,
    dateFrom: deferredDateFrom,
    dateTo: deferredDateTo,
    staffId: deferredStaffId,
  })

  const handleOpenDetails = (order: IOrder) => {
    modalRef.current?.open(order)
  }

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 bg-surface-50">
        {/* Page Header */}
        <View className="border-b border-outline-variant bg-white px-8 pt-8">
          <View className="mb-6">
            <Text className="text-5xl font-black tracking-tight text-surface-on">
              Quản lý Đơn hàng
            </Text>
          </View>

          <OrderFilterBar />

          <OrderStatusTabs />
        </View>

        {/* Orders Table Area */}
        <View className="flex-1 p-8">
          <View className="flex-1 overflow-hidden rounded-[24px] border border-outline-variant bg-white shadow-sm">
            {/* Table Header */}
            <View className="flex-row items-center border-b-2 border-outline-variant bg-[#f8fafc] px-8 py-5">
              <Text className="mr-8 w-48 text-lg font-bold uppercase tracking-wider text-muted">
                Thời gian
              </Text>
              <Text className="mr-8 w-52 text-lg font-bold uppercase tracking-wider text-muted">
                Mã Đơn
              </Text>
              <Text className="mr-8 flex-1 text-lg font-bold uppercase tracking-wider text-muted">
                Sản phẩm
              </Text>
              <Text
                className="mr-8 w-36 text-center text-lg font-bold uppercase tracking-wider text-muted"
                numberOfLines={1}
              >
                Thanh toán
              </Text>
              <Text className="mr-8 w-40 text-right text-lg font-bold uppercase tracking-wider text-muted">
                Tổng cộng
              </Text>
              <Text className="mr-8 w-52 text-center text-lg font-bold uppercase tracking-wider text-muted">
                Trạng thái
              </Text>
              <View className="w-12" />
            </View>

            <OrderList
              onOpenDetails={handleOpenDetails}
              orders={orders}
              isLoading={isLoading}
              fetchNextPage={fetchNextPage}
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />

            <OrderStatsFooter stats={stats} />
          </View>
        </View>

        <OrderDetailModal ref={modalRef} />
      </View>
    </SafeAreaView>
  )
}
