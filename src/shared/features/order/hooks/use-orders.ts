import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { OrderRemoteAPI } from '../api'
import { useOrderFilterStore } from '../store'

export const useOrders = (params: {
  status?: any
  dateFrom?: Date | null
  dateTo?: Date | null
  /** null = tất cả nhân viên */
  staffId?: string | null
  affiliateId?: string | null
  partnerId?: string | null
  guideType?: 'collaborator' | 'agent' | 'retail' | null
  paymentMethod?: string | null
  enabled?: boolean
}) => {
  const {
    status,
    dateFrom,
    dateTo,
    staffId,
    affiliateId,
    partnerId,
    guideType,
    paymentMethod,
    enabled,
  } = params

  // Search đã debounce ở OrderSearchInput trước khi vào store
  const searchQuery = useOrderFilterStore((s) => s.searchQuery.trim())
  const dateFromKey = dateFrom ? dateFrom.toISOString().slice(0, 10) : null
  const dateToKey = dateTo ? dateTo.toISOString().slice(0, 10) : null

  const query = useInfiniteQuery({
    queryKey: [
      'orders',
      status,
      searchQuery,
      dateFromKey,
      dateToKey,
      staffId,
      affiliateId,
      partnerId,
      guideType ?? null,
      paymentMethod,
    ],
    queryFn: async ({ pageParam = 1 }) =>
      OrderRemoteAPI.getOrders({
        status,
        searchQuery,
        dateFrom,
        dateTo,
        page: pageParam as number,
        limit: 20,
        staffId,
        affiliateId,
        partnerId,
        agentType: guideType,
        paymentMethod,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta as any
      return meta?.hasNextPage ? Number(meta.page || 1) + 1 : undefined
    },
    staleTime: 60_000,
    networkMode: 'always',
    enabled: enabled !== false,
  })

  // ponytail: không observe WatermelonDB orders → local write (bán hàng) từng storm refetch.
  // Invalidate tường minh sau refund/exchange/sync.

  const orders = useMemo(
    () => query.data?.pages.flatMap((page) => page.data || []) || [],
    [query.data],
  )

  const stats = useMemo(() => {
    const meta = query.data?.pages[0]?.meta as any
    return {
      count: meta?.total ?? 0,
      totalItems: meta?.totalItems ?? 0,
      totalRevenue: meta?.totalRevenue ?? 0,
    }
  }, [query.data])

  return {
    orders,
    stats,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading && orders.length === 0,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  }
}
