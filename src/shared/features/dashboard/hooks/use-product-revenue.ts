import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { DashboardRemoteAPI } from '../api/remote/dashboard.remote.api'
import { ProductRevenueResponse } from '../types'

const LIMIT = 10

export function useProductRevenue(shiftId?: string, staffId?: string | null) {
  const query = useInfiniteQuery({
    queryKey: ['dashboard', 'product-revenue', shiftId, staffId],
    queryFn: ({ pageParam = 0 }): Promise<ProductRevenueResponse> => {
      return DashboardRemoteAPI.fetchProductRevenueReport({
        shiftId: shiftId!,
        page: pageParam as number,
        limit: LIMIT,
        staffId,
      })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1
      const loadedCount = nextPage * lastPage.pageSize
      return loadedCount < lastPage.totalCount ? nextPage : undefined
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache stale time
    enabled: !!shiftId, // Require shiftId to run query
  })

  const products = useMemo(() => {
    return query.data?.pages.flatMap((page) => page.items) || []
  }, [query.data?.pages])

  const totalRevenue = query.data?.pages[0]?.totalRevenue
  const totalItems = query.data?.pages[0]?.totalItems

  return {
    products,
    totalRevenue,
    totalItems,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    loadMore: () => query.fetchNextPage(),
    refetch: query.refetch,
    error: query.error,
  }
}
