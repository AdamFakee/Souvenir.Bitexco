import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { ProductRevenueResponse } from '../../types'

const DASHBOARD_TIMEOUT_MS = 12_000
const LIMIT = 10

export interface GetProductRevenueReportParams {
  shiftId: string
  page?: number
  limit?: number
  staffId?: string | null
}

export type GetProductRevenueReportResponse = ProductRevenueResponse

// 1. Query Key Factory
export const getProductRevenueReportQueryKey = (shiftId?: string, staffId?: string | null) =>
  ['dashboard', 'product-revenue', shiftId, staffId] as const

// 2. API Function
export const getProductRevenueReport = async (
  params: GetProductRevenueReportParams,
): Promise<GetProductRevenueReportResponse> => {
  const { shiftId, page = 0, limit = 10, staffId } = params
  const axios = AxiosService.getInstance()
  const queryParams: Record<string, string | number> = { shiftId, page, limit }
  if (staffId) queryParams.staffId = staffId
  const response = await axios.get<ProductRevenueResponse>('/v1/pos/dashboard/product-revenue', {
    params: queryParams,
    timeout: DASHBOARD_TIMEOUT_MS,
  })
  return response.data
}

// 3. Custom Hook
export const useGetProductRevenueReport = (shiftId?: string, staffId?: string | null) => {
  const query = useInfiniteQuery({
    queryKey: getProductRevenueReportQueryKey(shiftId, staffId),
    queryFn: ({ pageParam = 0 }): Promise<ProductRevenueResponse> =>
      getProductRevenueReport({
        shiftId: shiftId!,
        page: pageParam as number,
        limit: LIMIT,
        staffId,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1
      const loadedCount = nextPage * lastPage.pageSize
      return loadedCount < lastPage.totalCount ? nextPage : undefined
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!shiftId,
    placeholderData: keepPreviousData,
    retry: 1,
    networkMode: 'always',
  })

  const products = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) || [],
    [query.data?.pages],
  )

  return {
    products,
    totalRevenue: query.data?.pages[0]?.totalRevenue,
    totalItems: query.data?.pages[0]?.totalItems,
    isLoading: query.isLoading && products.length === 0,
    isFetchingNextPage: query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    loadMore: query.fetchNextPage,
    refetch: query.refetch,
    error: query.error,
  }
}
