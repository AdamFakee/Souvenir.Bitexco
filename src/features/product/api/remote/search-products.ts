import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { PosLookupRawResult, PosLookupResult } from '@/shared/types'
import { useQuery, UseQueryOptions } from '@tanstack/react-query'

// 1. Types cục bộ cho endpoint
export interface SearchProductsParams {
  q: string
  warehouseId?: string
  limit?: number
}

export type SearchProductsResponse = PosLookupResult[]

// 2. Query Key Factory
export const searchProductsQueryKey = (params: SearchProductsParams) =>
  ['products', 'search', params] as const

// 3. API Function
export const searchProducts = async (
  params: SearchProductsParams,
): Promise<SearchProductsResponse> => {
  const axios = AxiosService.getInstance()

  const response = await axios.get<PosLookupRawResult[]>('/v1/pos/search', {
    params: {
      q: params.q,
      warehouseId: params.warehouseId,
      limit: params.limit || 25,
    },
  })

  const rawItems = response.data || []
  return rawItems.map((item) => ({
    ...item,
    price: item.price ?? 0,
    barcode: item.barcode ?? item.sku ?? '',
  }))
}

// 4. Custom Hook
export const useSearchProducts = (
  params: SearchProductsParams,
  options?: Omit<UseQueryOptions<SearchProductsResponse, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: searchProductsQueryKey(params),
    queryFn: () => searchProducts(params),
    enabled: Boolean(params.q?.trim()),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    ...options,
  })
}
