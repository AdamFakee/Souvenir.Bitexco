import { database } from '@/shared/lib/database'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { OrderRemoteAPI } from '../api'

export const useOrders = (params: {
  status?: any
  searchQuery?: string
  dateFrom?: Date | null
  dateTo?: Date | null
}) => {
  const { status, searchQuery, dateFrom, dateTo } = params

  const query = useInfiniteQuery({
    queryKey: ['orders', status, searchQuery, dateFrom, dateTo],
    queryFn: async ({ pageParam = 1 }) => {
      return await OrderRemoteAPI.getOrders({
        status,
        searchQuery,
        dateFrom,
        dateTo,
        page: pageParam as number,
        limit: 20,
      })
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta as any
      return meta?.hasNextPage ? (meta.page as number) + 1 : undefined
    },
    networkMode: 'always',
  })

  const queryClient = useQueryClient()

  // Listen to local database changes to keep the list in sync
  useEffect(() => {
    const subscription = database.withChangesForTables(['orders']).subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  const orders = useMemo(() => {
    return query.data?.pages.flatMap((page) => page.data || []) || []
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
