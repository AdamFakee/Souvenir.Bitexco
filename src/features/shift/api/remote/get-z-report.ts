import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { ZReportResponse } from '@/features/shift/types'

// 1. Types cục bộ cho endpoint
export interface GetZReportParams {
  shiftId: string
}

export type GetZReportResponse = ZReportResponse

// 2. Query Key Factory
export const getZReportQueryKey = (shiftId?: string) =>
  ['cash-sessions', 'z-report', shiftId] as const

// 3. API Function
export const getZReport = async (shiftId: string): Promise<GetZReportResponse> => {
  const axios = AxiosService.getInstance()
  const response = await axios.get<ZReportResponse>(`/v1/cash-sessions/${shiftId}/z-report`)
  return response.data
}

// 4. Custom Hook
export const useGetZReport = (
  shiftId: string,
  options?: Omit<UseQueryOptions<GetZReportResponse, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: getZReportQueryKey(shiftId),
    queryFn: () => getZReport(shiftId),
    enabled: Boolean(shiftId),
    ...options,
  })
}
