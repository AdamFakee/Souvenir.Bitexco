import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { DashboardRemoteAPI } from '../api/remote/dashboard.remote.api'
import { ProductRevenueItem } from '../types'

const LIMIT = 10

export function useProductRevenue(shiftId?: string) {
  const query = useInfiniteQuery({
    queryKey: ['dashboard', 'product-revenue', shiftId],
    queryFn: ({ pageParam = 0 }): Promise<ProductRevenueItem[]> => {
      return DashboardRemoteAPI.fetchProductRevenueReport({
        shiftId,
        page: pageParam as number,
        limit: LIMIT,
      })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length : undefined
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache stale time
    enabled: !!shiftId, // Require shiftId to run query
  })

  const products = useMemo(() => {
    return query.data?.pages.flat() || []
  }, [query.data?.pages])

  return {
    products,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    loadMore: () => query.fetchNextPage(),
    refetch: query.refetch,
    error: query.error,
  }
}
