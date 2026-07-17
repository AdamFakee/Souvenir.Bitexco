import { database } from '@/shared/lib/database'
import { keepPreviousData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useDebounce } from 'use-debounce'
import { OrderRemoteAPI } from '../api'

export const useOrders = (params: {
  status?: any
  searchQuery?: string
  dateFrom?: Date | null
  dateTo?: Date | null
  /** Mã nhân viên để lọc đơn hàng. null = tất cả nhân viên */
  staffId?: string | null
  affiliateId?: string | null
  partnerId?: string | null
  /** Phân loại chế độ xem guide: 'collaborator' | 'agent' — dùng để invalidate cache khi switch tab */
  guideType?: 'collaborator' | 'agent' | null
  paymentMethod?: string | null
}) => {
  const {
    status,
    searchQuery,
    dateFrom,
    dateTo,
    staffId,
    affiliateId,
    partnerId,
    guideType,
    paymentMethod,
  } = params
  const normalizedSearchQuery = searchQuery?.trim() || ''
  const [debouncedSearchQuery] = useDebounce(normalizedSearchQuery, 300)
  const dateFromKey = dateFrom?.toISOString() || null
  const dateToKey = dateTo?.toISOString() || null

  const query = useInfiniteQuery({
    queryKey: [
      'orders',
      status,
      debouncedSearchQuery,
      dateFromKey,
      dateToKey,
      staffId,
      affiliateId,
      partnerId,
      guideType ?? null,
      paymentMethod,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      return await OrderRemoteAPI.getOrders({
        status,
        searchQuery: debouncedSearchQuery,
        dateFrom,
        dateTo,
        page: pageParam as number,
        limit: 20,
        staffId,
        affiliateId,
        partnerId,
        agentType: guideType,
        paymentMethod,
      })
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta as any
      return meta?.hasNextPage ? Number(meta.page || 1) + 1 : undefined
    },
    staleTime: 30000, // 30 seconds stale time
    networkMode: 'always',
    // Giữ page cũ khi đổi tab/filter key — tránh skeleton blank ~2s
    placeholderData: keepPreviousData,
  })

  const queryClient = useQueryClient()

  // ponytail: sync only when app returns from background (network reconnect), not on every DB change.
  // withChangesForTables fires on every local write → aggressive refetch loop.
  // Re-evaluate if real-time sync across devices becomes a requirement.
  useEffect(() => {
    const subscription = database.withChangesForTables(['orders']).subscribe(() => {
      // Chỉ invalidate khi có thay đổi từ xa (sync push), không phải từ local writes
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  const orders = useMemo(() => {
    return query.data?.pages.flatMap((page) => page.data || []) || []
  }, [query.data])

  const stats = useMemo(() => {
    const firstPageMeta = query.data?.pages[0]?.meta as any

    // Calculate client-side totals across loaded orders as a fallback
    let clientTotalItems = 0
    let clientTotalRevenue = 0
    orders.forEach((o) => {
      const itemQty = o.itemsSnapshot?.reduce((sum, item) => sum + (item.quantity || 0), 0) ?? 0
      clientTotalItems += itemQty
      clientTotalRevenue += o.total || 0
    })

    return {
      count: firstPageMeta?.total ?? orders.length,
      totalItems: firstPageMeta?.totalItems || clientTotalItems,
      totalRevenue: firstPageMeta?.totalRevenue || clientTotalRevenue,
    }
  }, [query.data, orders])

  return {
    orders,
    stats,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    // Skeleton chỉ khi chưa có data (kể cả placeholder)
    isLoading: query.isLoading && orders.length === 0,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  }
}
