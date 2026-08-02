import { useDevice } from '@/shared/features/app/hooks/use-app-context'
import { ProductLocalAPI } from '@/shared/features/product'
import { ProductRemoteAPI } from '@/shared/features/product/api/remote/product.remote.api'
import { database } from '@/shared/lib/database'
import { ProductModel } from '@/shared/lib/database/models'
import { toast, useConnectionStore } from '@/shared/store'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useDebounce } from 'use-debounce'

const LIMIT = 15

export interface UnifiedProduct {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  unitId: string
  unitCode: string
  taxRate: number
  barcode?: string
}

export function useProductSearch(searchText: string) {
  const [debouncedSearch] = useDebounce(searchText, 500)
  const queryClient = useQueryClient()
  const device = useDevice()
  const warehouseId = device?.warehouseId

  const query = useInfiniteQuery({
    queryKey: ['products', 'search', debouncedSearch, warehouseId],
    queryFn: async ({ pageParam = 0 }): Promise<UnifiedProduct[]> => {
      try {
        if (!debouncedSearch.trim()) return []
        const isNetworkConnected = useConnectionStore.getState().isNetworkConnected

        // 1. Luồng Online First
        if (isNetworkConnected) {
          try {
            const remoteResults = await ProductRemoteAPI.searchProducts({
              q: debouncedSearch,
              warehouseId,
              limit: LIMIT,
            })
            return remoteResults.map((r) => ({
              id: r.variantId,
              name: r.productNameEn || r.productName,
              sku: r.sku,
              price: r.price,
              stock: r.available,
              unitId: r.unitId,
              unitCode: r.unitCode,
              taxRate: (r as any).taxRate ?? (r as any).tax_rate ?? 0,
              barcode: r.barcode,
            }))
          } catch (err) {
            console.error('Online search failed, falling back to local search:', err)
          }
        }

        // 2. Luồng Offline Fallback
        const localResults = await ProductLocalAPI.getProducts({
          searchQuery: debouncedSearch,
          page: pageParam as number,
          limit: LIMIT,
        })

        return localResults.map((p) => ({
          id: p.id,
          name: p.nameEn || p.name,
          sku: p.sku,
          price: p.price,
          stock: p.stock,
          unitId: p.unitId,
          unitCode: p.unitCode,
          taxRate: p.taxRate || 0,
          barcode: p.barcode,
        }))
      } catch {
        toast.error('Không thể tìm kiếm sản phẩm. Vui lòng thử lại!', 'Lỗi tìm kiếm')
        return []
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length : undefined
    },
    initialPageParam: 0,
    enabled: debouncedSearch.trim().length > 0,
    staleTime: 0,
    gcTime: 0, // Garbage collect instantly to prevent React Query from serving stale cached search results
    networkMode: 'always',
  })

  // Reactive: Lắng nghe mọi thay đổi trong SQLite bảng products để cập nhật UI ngay lập tức
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
