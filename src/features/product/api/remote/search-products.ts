import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { PosLookupResult } from '@/shared/types'

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

  const response = await axios.get<PosLookupResult[]>('/v1/pos/search', {
    params: {
      q: params.q,
      warehouseId: params.warehouseId,
      limit: params.limit || 25,
    },
  })
  return response.data
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
    ...options,
  })
}
