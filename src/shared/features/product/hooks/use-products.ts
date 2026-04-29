import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ProductLocalAPI } from '../api/local/product.local.api'

export const useProducts = (params: { categoryId?: string | null; searchQuery?: string }) => {
  const { categoryId, searchQuery } = params

  const query = useInfiniteQuery({
    queryKey: ['products', categoryId, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      return await ProductLocalAPI.getProducts({
        categoryId,
        searchQuery,
        page: pageParam as number,
        limit: 21,
      })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 21) {
        return undefined
      }
      return allPages.length
    },
  })

  const products = useMemo(() => {
    return query.data?.pages.flatMap((page) => page) || []
  }, [query.data])

  return {
    products,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
