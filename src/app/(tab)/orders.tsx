import { DatePicker, EmptyState, LoadMore, Shimmer } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import OrderDetailModal, {
  OrderDetailModalRef,
} from '@/shared/features/order/components/order-detail-modal'
import { useOrders } from '@/shared/features/order/hooks'
import { OrderModel } from '@/shared/lib/database'
import { OrderStatus } from '@/shared/lib/database/models/order'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { Box, Eye, ListChecks, PackageOpen, Search, X } from 'lucide-react-native'
import React, { useMemo, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

export default function OrdersScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const [status, setStatus] = useState<OrderStatus | null>(null)
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)

  const modalRef = useRef<OrderDetailModalRef>(null)

  const { orders, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders({
    status,
    searchQuery,
    dateFrom,
    dateTo,
  })

  const stats = useMemo(() => {
    let totalRevenue = 0
    let totalItems = 0
    orders.forEach((o) => {
      if (o.status === OrderStatus.COMPLETED) {
        totalRevenue += o.total
      }
      totalItems += o.itemsSnapshot?.reduce((acc, item) => acc + item.quantity, 0) || 0
    })
    return {
      totalRevenue,
      totalItems,
      count: orders.length,
    }
  }, [orders])

  const handleOpenDetails = (order: OrderModel) => {
    modalRef.current?.open(order)
  }

  const statusLabels: Record<string, string> = {
    ALL: 'Tất cả',
    COMPLETED: 'Hoàn thành',
    REFUNDED: 'Hoàn tiền',
    FAILED: 'Thất bại',
  }

  const statusColors: Record<string, string> = {
    COMPLETED: COLORS.success.default,
    REFUNDED: COLORS.warning.default,
    FAILED: COLORS.error.default,
  }

  const statusBgColors: Record<string, string> = {
    COMPLETED: COLORS.success.container,
    REFUNDED: COLORS.warning.container,
    FAILED: COLORS.error.container,
  }

  const getPaymentMethodInfo = (order: OrderModel) => {
    const payments = order.paymentsSnapshot || []
    if (payments.length === 0) return { label: '—', color: COLORS.muted, bg: COLORS.surface[100] }

    const method = payments[0].method.toUpperCase()
    switch (method) {
      case 'CASH':
        return {
          label: 'Tiền mặt',
          color: COLORS.success.onContainer,
          bg: COLORS.success.container,
        }
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

  return (
    <View className="flex-1 bg-surface-50">
      {/* Page Header */}
      <View className="border-b border-outline-variant bg-white px-8 pt-8">
        <View className="mb-6">
          <Text className="text-4xl font-black tracking-tight text-surface-on">
            Quản lý Đơn hàng
          </Text>
        </View>

        {/* Filter Bar */}
        <View className="mb-6 flex-row items-center gap-4">
          <View className="h-12 flex-1 flex-row items-center rounded-xl border border-outline-variant bg-surface-100 px-4">
            <Search size={18} color={COLORS.outline.default} />
            <TextInput
              className="ml-3 flex-1 text-base font-medium text-surface-on"
              placeholder="Tìm kiếm đơn hàng..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={18} color={COLORS.outline.default} />
              </Pressable>
            )}
          </View>

          <View className="flex-row items-center gap-3">
            <DatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Từ ngày"
              className="w-44"
              maxDate={dateTo || undefined}
            />
            <Text className="font-medium text-muted">đến</Text>
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="Đến ngày"
              className="w-44"
              minDate={dateFrom || undefined}
            />
          </View>
        </View>

        {/* Status Tabs */}
        <View className="flex-row gap-0">
          {(['ALL', OrderStatus.COMPLETED, OrderStatus.REFUNDED, OrderStatus.FAILED] as const).map(
            (s) => {
              const isActive = s === 'ALL' ? status === null : status === s
              const label = statusLabels[s]
              return (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s === 'ALL' ? null : s)}
                  className={`border-b-2 px-8 py-4 transition-all ${
                    isActive ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <Text
                      className={`text-lg font-bold ${isActive ? 'text-primary' : 'text-muted'}`}
                    >
                      {label}
                    </Text>
                    {isActive && (
                      <View
                        className="rounded-full px-2.5 py-0.5"
                        style={{
                          backgroundColor: s === 'ALL' ? COLORS.primary.fixed : statusBgColors[s],
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{
                            color: s === 'ALL' ? COLORS.primary.onFixedVariant : statusColors[s],
                          }}
                        >
                          {orders.length}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              )
            },
          )}
        </View>
      </View>

      {/* Orders Table Area */}
      <View className="flex-1 p-8">
        <View className="flex-1 overflow-hidden rounded-[24px] border border-outline-variant bg-white shadow-sm">
          {/* Table Header */}
          <View className="flex-row items-center border-b-2 border-outline-variant bg-[#f8fafc] px-8 py-5">
            <Text className="mr-6 w-44 text-sm font-bold uppercase tracking-wider text-muted">
              Mã Đơn
            </Text>
            <Text className="mr-6 w-44 text-sm font-bold uppercase tracking-wider text-muted">
              Thời gian
            </Text>
            <Text className="mr-6 flex-1 text-sm font-bold uppercase tracking-wider text-muted">
              Sản phẩm
            </Text>
            <Text className="mr-6 w-56 text-center text-sm font-bold uppercase tracking-wider text-muted">
              Phương thức thanh toán
            </Text>
            <Text className="mr-6 w-40 text-right text-sm font-bold uppercase tracking-wider text-muted">
              Tổng cộng
            </Text>
            <Text className="mr-6 w-36 text-center text-sm font-bold uppercase tracking-wider text-muted">
              Trạng thái
            </Text>
            <View className="w-16" />
          </View>

          {isLoading ? (
            <View className="flex-1">
              {[...Array(8)].map((_, i) => (
                <OrderSkeleton key={i} />
              ))}
            </View>
          ) : (
            <FlashList
              data={orders}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const itemsCount = item.itemsSnapshot?.length || 0
                const firstItem = item.itemsSnapshot?.[0]
                const pttt = getPaymentMethodInfo(item)

                return (
                  <Pressable
                    onPress={() => handleOpenDetails(item)}
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
                        style={{ backgroundColor: statusBgColors[item.status] }}
                      >
                        <Text
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{ color: statusColors[item.status] }}
                        >
                          {statusLabels[item.status]}
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
                  onAction={() => {
                    setSearchQuery('')
                    setStatus(null)
                    setDateFrom(null)
                    setDateTo(null)
                  }}
                />
              }
            />
          )}

          {/* Table Footer Summary */}
          <View className="flex-row items-center border-t-2 border-outline-variant bg-[#f8fafc] px-8 py-5">
            <View className="w-48 flex-row items-center gap-2">
              <ListChecks size={18} color={COLORS.outline.default} />
              <Text className="text-sm font-medium text-muted">
                Tổng cộng: <Text className="font-bold text-surface-on">{stats.count} đơn</Text>
              </Text>
            </View>
            <View className="w-48 flex-row items-center gap-2">
              <Box size={18} color={COLORS.outline.default} />
              <Text className="text-sm font-medium text-muted">
                Sản phẩm: <Text className="font-bold text-surface-on">{stats.totalItems}</Text>
              </Text>
            </View>
            <View className="flex-1" />
            <View className="flex-row items-center gap-4">
              <Text className="text-sm font-medium text-muted">(Chỉ tính đơn hoàn thành)</Text>
              <Text className="text-2xl font-black text-primary">
                {formatCurrency(stats.totalRevenue)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <OrderDetailModal ref={modalRef} />
    </View>
  )
}
