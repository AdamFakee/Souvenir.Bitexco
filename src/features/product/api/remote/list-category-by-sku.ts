import { useInfiniteQuery } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { PosLookupResult } from '@/shared/types'

// 1. Types cục bộ cho endpoint
export interface ListCategoryBySkuParams {
  skus: string[]
  warehouseId?: string
  page?: number
  limit?: number
}

export interface ListCategoryBySkuResponse {
  items: PosLookupResult[]
  page: number
  limit: number
  hasMore: boolean
}

// 2. Query Key Factory
export const listCategoryBySkuQueryKey = (params: ListCategoryBySkuParams) =>
  ['products', 'category-by-sku', params] as const

// 3. API Function
export const listCategoryBySku = async (
  params: ListCategoryBySkuParams,
): Promise<ListCategoryBySkuResponse> => {
  const axios = AxiosService.getInstance()
  const skus = params.skus.map((s) => s.trim()).filter(Boolean)
  const page = params.page && params.page > 0 ? params.page : 1
  const limit = params.limit || 40

  if (skus.length === 0) {
    return { items: [], page, limit, hasMore: false }
  }

  const response = await axios.get<{
    items?: PosLookupResult[]
    page?: number
    limit?: number
    hasMore?: boolean
  }>('/v1/pos/category', {
    params: {
      sku: skus,
      warehouseId: params.warehouseId,
      page,
      limit,
    },
    paramsSerializer: {
      indexes: null,
    } as any,
  })

  const data = response.data ?? {}
  const items = Array.isArray(data.items) ? data.items : []

  return {
    items,
    page: data.page ?? page,
    limit: data.limit ?? limit,
    hasMore: typeof data.hasMore === 'boolean' ? data.hasMore : false,
  }
}

// 4. Custom Hook (useInfiniteQuery)
export const useListCategoryBySku = (params: Omit<ListCategoryBySkuParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: listCategoryBySkuQueryKey(params),
    queryFn: ({ pageParam = 1 }) => listCategoryBySku({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: params.skus.length > 0,
  })
}
