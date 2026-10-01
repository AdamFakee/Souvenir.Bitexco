import { keepPreviousData, useQuery, UseQueryOptions } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { DashboardOverviewResponse } from '../../types'

const DASHBOARD_TIMEOUT_MS = 12_000

export interface GetDashboardOverviewParams {
  shiftId: string
  staffId?: string | null
}

export type GetDashboardOverviewResponse = DashboardOverviewResponse

// 1. Query Key Factory
export const getDashboardOverviewQueryKey = (shiftId?: string, staffId?: string | null) =>
  ['dashboard', 'overview', shiftId, staffId] as const

// 2. API Function
export const getDashboardOverview = async (
  shiftId: string,
  staffId?: string | null,
): Promise<GetDashboardOverviewResponse> => {
  const axios = AxiosService.getInstance()
  const params: Record<string, string> = { shiftId }
  if (staffId) params.staffId = staffId
  const response = await axios.get<DashboardOverviewResponse>('/v1/pos/dashboard/overview', {
    params,
    timeout: DASHBOARD_TIMEOUT_MS,
  })
  return response.data
}

// 3. Custom Hook
export const useGetDashboardOverview = (
  shiftId?: string,
  staffId?: string | null,
  options?: Omit<UseQueryOptions<GetDashboardOverviewResponse, Error>, 'queryKey' | 'queryFn'>,
) => {
  const query = useQuery({
    queryKey: getDashboardOverviewQueryKey(shiftId, staffId),
    queryFn: () => getDashboardOverview(shiftId!, staffId),
    staleTime: 5 * 60 * 1000,
    enabled: !!shiftId,
    placeholderData: keepPreviousData,
    retry: 1,
    networkMode: 'always',
    ...options,
  })

  return {
    overview: query.data ?? null,
    isLoading: !!shiftId && query.isLoading && !query.data,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}
