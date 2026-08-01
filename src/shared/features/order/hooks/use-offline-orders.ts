import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { OrderLocalAPI } from '../api/local/order.local.api'
import { useOrderFilterStore } from '../store'
import type { IOrder } from '../types'
import { OrderModel } from '@/shared/lib/database'

const LIMIT = 20

const mapLocalOrderToIOrder = (o: OrderModel): IOrder => ({
  id: o.id,
  code: null,
  shiftId: o.shiftId,
  staffId: o.staffId,
  status: o.status as any,
  subtotal: o.subtotal,
  discount: o.discount,
  voucherCode: o.voucherCode,
  voucherDiscount: o.voucherDiscount,
  total: o.total,
  totalTax: o.totalTax,
  note: o.note,
  refundReason: o.refundReason,
  originalOrderId: o.originalOrderId,
  customerTaxInfo: o.customerTaxInfo,
  itemsSnapshot: o.itemsSnapshot,
  paymentsSnapshot: o.paymentsSnapshot,
  isDeleted: o.isDeleted,
  canReturn: false,
  canExchange: false,
  createdAt: o.createdAt,
  updatedAt: o.updatedAt,
})

export const useOfflineOrders = (params?: { enabled?: boolean }) => {
  const searchQuery = useOrderFilterStore((s) => s.searchQuery.trim())
  const enabled = params?.enabled !== false

  const query = useInfiniteQuery({
    queryKey: ['orders', 'offline', searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      const results = await OrderLocalAPI.getOrders({
        searchQuery,
        limit: LIMIT,
        offset: (pageParam as number) * LIMIT,
        isSynced: false,
      })
      return results.map(mapLocalOrderToIOrder)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length : undefined
    },
    staleTime: 5000,
    enabled,
  })

  const orders = useMemo(() => query.data?.pages.flat() || [], [query.data])

  const statsQuery = useQuery({
    queryKey: ['orders', 'offline', 'stats', searchQuery],
    queryFn: async () => {
      const allUnsynced = await OrderLocalAPI.getOrders({
        searchQuery,
        limit: 999999,
        offset: 0,
        isSynced: false,
      })
      let totalItems = 0
      let totalRevenue = 0
      for (const o of allUnsynced) {
        totalItems += o.itemsSnapshot?.reduce((s, it) => s + (it.quantity || 0), 0) ?? 0
        totalRevenue += o.total || 0
      }
      return {
        count: allUnsynced.length,
        totalItems,
        totalRevenue,
      }
    },
    staleTime: 5000,
    enabled,
  })

  return {
    orders,
    stats: statsQuery.data || { count: 0, totalItems: 0, totalRevenue: 0 },
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading || statsQuery.isLoading,
    refetch: () => {
      query.refetch()
      statsQuery.refetch()
    },
  }
}
