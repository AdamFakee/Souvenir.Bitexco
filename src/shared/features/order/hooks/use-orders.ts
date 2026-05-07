import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { GetOrdersParams, OrderLocalAPI } from '../api/local/order.local.api'

export const useOrders = (params: Omit<GetOrdersParams, 'limit' | 'offset'>) => {
  const { status, searchQuery, dateFrom, dateTo } = params

  const query = useInfiniteQuery({
    queryKey: ['orders', status, searchQuery, dateFrom, dateTo],
    queryFn: async ({ pageParam = 0 }) => {
      console.log('Fetching orders', params)
      return await OrderLocalAPI.getOrders({
        status,
        searchQuery,
        dateFrom,
        dateTo,
        offset: pageParam as number,
        limit: 20,
      })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) {
        return undefined
      }
      return allPages.length * 20
    },
    networkMode: 'always',
  })

  const orders = useMemo(() => {
    return query.data?.pages.flatMap((page) => page) || []
  }, [query.data])

  return {
    orders,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
