import { ProductLocalAPI } from '@/shared/features/product'
import { database } from '@/shared/lib/database'
import { ProductModel } from '@/shared/lib/database/models'
import { toast } from '@/shared/store'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useDebounce } from 'use-debounce'

const LIMIT = 15

export function useProductSearch(searchText: string) {
  const [debouncedSearch] = useDebounce(searchText, 300)
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: ['products', 'search', debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        if (!debouncedSearch.trim()) return []
        return await ProductLocalAPI.getProducts({
          searchQuery: debouncedSearch,
          page: pageParam as number,
          limit: LIMIT,
        })
      } catch (error) {
        console.error('Search error:', error)
        toast.error('Không thể tìm kiếm sản phẩm. Vui lòng thử lại!', 'Lỗi tìm kiếm')
        return []
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length : undefined
    },
    initialPageParam: 0,
    enabled: debouncedSearch.trim().length > 0,
    // Set staleTime to 0 to ensure it always checks the DB
    // when the search query changes or component remounts
    staleTime: 0,
    networkMode: 'always',
  })

  // Reactive: Listen to ANY changes in the products table and invalidate the query
  // This ensures that if stock or price changes in DB, the UI updates instantly
  useEffect(() => {
    const subscription = database.get<ProductModel>('products').changes.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    })
    return () => subscription.unsubscribe()
  }, [queryClient])

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
  }
}
