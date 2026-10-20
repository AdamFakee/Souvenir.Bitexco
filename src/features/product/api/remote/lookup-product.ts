import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { PosLookupRawResult, PosLookupResult } from '@/shared/types'

// 1. Types cục bộ cho endpoint
export interface LookupProductParams {
  barcode?: string
  sku?: string
  warehouseId?: string
}

export type LookupProductResponse = PosLookupResult | null

// 2. Query Key Factory
export const lookupProductQueryKey = (params?: LookupProductParams) =>
  ['products', 'lookup', params] as const

// 3. API Function
export const lookupProduct = async (
  params: LookupProductParams,
): Promise<LookupProductResponse> => {
  const axios = AxiosService.getInstance()

  const queryParams: Record<string, string> = {}
  if (params.barcode) queryParams.barcode = params.barcode
  if (params.sku) queryParams.sku = params.sku
  if (params.warehouseId) queryParams.warehouseId = params.warehouseId

  try {
    const response = await axios.get<PosLookupRawResult>('/v1/pos/lookup', {
      params: queryParams,
    })
    const data = response.data
    if (!data) return null

    return {
      ...data,
      price: data.price ?? 0,
      barcode: data.barcode ?? data.sku ?? '',
    }
  } catch (error: any) {
    console.warn(
      '[lookupProduct] RESPONSE ERROR:',
      error.response?.status,
      JSON.stringify(error.response?.data || error.message, null, 2),
    )
    if (error.response?.status === 404) {
      return null
    }
    throw error
  }
}

// 4. Custom Hook
export const useLookupProduct = (
  params: LookupProductParams,
  options?: Omit<UseQueryOptions<LookupProductResponse, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: lookupProductQueryKey(params),
    queryFn: () => lookupProduct(params),
    enabled: Boolean(params.barcode || params.sku),
    ...options,
  })
}
