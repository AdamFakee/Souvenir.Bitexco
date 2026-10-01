import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { CashSession } from '@/shared/types'

// 1. Types cục bộ cho endpoint
export interface GetShiftByIdParams {
  shiftId: string
}

export type GetShiftByIdResponse = CashSession

// 2. Query Key Factory
export const getShiftByIdQueryKey = (shiftId?: string) =>
  ['cash-sessions', 'detail', shiftId] as const

// 3. API Function
export const getShiftById = async (shiftId: string): Promise<GetShiftByIdResponse> => {
  const axios = AxiosService.getInstance()
  const response = await axios.get<CashSession | { session: CashSession } | { data: CashSession }>(
    `/v1/cash-sessions/${shiftId}`,
  )
  const raw = response.data as any
  const session: CashSession | undefined = raw?.session ?? raw?.data ?? (raw?.id ? raw : undefined)
  if (!session?.id) throw new Error(`getShiftById: invalid payload for ${shiftId}`)
  return session
}

// 4. Custom Hook
export const useGetShiftById = (
  shiftId: string,
  options?: Omit<UseQueryOptions<GetShiftByIdResponse, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: getShiftByIdQueryKey(shiftId),
    queryFn: () => getShiftById(shiftId),
    enabled: Boolean(shiftId),
    ...options,
  })
}
