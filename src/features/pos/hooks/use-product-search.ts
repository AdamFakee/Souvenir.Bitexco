import { useDevice } from '@/features/app/hooks/use-app-context'
import { getProducts, searchProducts } from '@/features/product'
import { useConnectionStore } from '@/core/hardware'
import { toast } from '@/shared/store'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useRef } from 'react'

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
  isActive?: boolean
  priceStatus?: string
}

export function useProductSearch(searchText: string) {
  const device = useDevice()
  const warehouseId = device?.warehouseId

  const query = useInfiniteQuery({
    queryKey: ['products', 'search', searchText, warehouseId],
    queryFn: async ({ pageParam = 0 }): Promise<UnifiedProduct[]> => {
      try {
        if (!searchText.trim()) return []
        const isNetworkConnected = useConnectionStore.getState().isNetworkConnected

        // 1. Luồng Online First
        if (isNetworkConnected) {
          try {
            const remoteResults = await searchProducts({
              q: searchText,
              warehouseId,
              limit: LIMIT,
            })
            return remoteResults.map((r) => ({
              id: r.variantId,
              name: r.productNameEn || r.productName,
              sku: r.sku,
              price: r.price ?? 0,
              stock: r.available,
              unitId: r.unitId,
              unitCode: r.unitCode,
              taxRate: (r as any).taxRate ?? (r as any).tax_rate ?? 0,
              barcode: r.barcode || undefined,
              isActive: r.isActive,
              priceStatus: r.priceStatus,
            }))
          } catch (err) {
            console.error('Online search failed, falling back to local search:', err)
          }
        }

        // 2. Luồng Offline Fallback
        const localResults = await getProducts({
          searchQuery: searchText,
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
          isActive: p.isActive,
          priceStatus: p.priceStatus || 'available',
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
    enabled: searchText.trim().length > 0,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
  })

  // ponytail: stabilize fetchNextPage via ref so SearchResultList memo isn't broken
  // every render. useInfiniteQuery returns a new fetchNextPage ref each render.
  const fetchNextPageRef = useRef(query.fetchNextPage)
  fetchNextPageRef.current = query.fetchNextPage

  const loadMore = useCallback(() => {
    fetchNextPageRef.current()
  }, [])

  const products = useMemo(() => {
    return query.data?.pages.flat() || []
  }, [query.data?.pages])

  return useMemo(
    () => ({
      products,
      isLoading: query.isLoading,
      isFetchingNextPage: query.isFetchingNextPage,
      hasMore: !!query.hasNextPage,
      loadMore,
      refetch: query.refetch,
    }),
    [
      products,
      query.isLoading,
      query.isFetchingNextPage,
      query.hasNextPage,
      loadMore,
      query.refetch,
    ],
  )
}
