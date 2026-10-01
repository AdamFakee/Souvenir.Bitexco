import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { ShiftStatistics } from '@/shared/mocks/mock-data'
import type { CashSession } from '@/shared/types'

// 1. Types cục bộ cho endpoint
export interface GetShiftStatisticsParams {
  shiftId: string
}

export type GetShiftStatisticsResponse = ShiftStatistics

// 2. Query Key Factory
export const getShiftStatisticsQueryKey = (shiftId?: string) =>
  ['cash-sessions', 'statistics', shiftId] as const

// 3. API Function
export const getShiftStatistics = async (shiftId: string): Promise<GetShiftStatisticsResponse> => {
  const axios = AxiosService.getInstance()
  const response = await axios.get<any>(`/v1/cash-sessions/${shiftId}`)
  const raw = response.data
  const session: CashSession | undefined = raw?.session ?? raw?.data ?? (raw?.id ? raw : undefined)
  return {
    expectedEndingCash: session?.expectedCash ?? session?.openingCash ?? 0,
  }
}

// 4. Custom Hook
export const useGetShiftStatistics = (
  shiftId: string,
  options?: Omit<UseQueryOptions<GetShiftStatisticsResponse, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: getShiftStatisticsQueryKey(shiftId),
    queryFn: () => getShiftStatistics(shiftId),
    enabled: Boolean(shiftId),
    ...options,
  })
}
