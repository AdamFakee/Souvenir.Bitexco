import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { CashSession } from '@/shared/types'
import { useQuery, UseQueryOptions } from '@tanstack/react-query'

// 1. Types cục bộ cho endpoint
export interface GetOpenSessionsParams {
  posDeviceId: string
}

export type GetOpenSessionsResponse = CashSession[]

// 2. Query Key Factory
export const getOpenSessionsQueryKey = (posDeviceId?: string) =>
  ['cash-sessions', 'open', posDeviceId] as const

// 3. API Function
export const getOpenSessions = async (posDeviceId: string): Promise<GetOpenSessionsResponse> => {
  const axios = AxiosService.getInstance()
  console.log('[AppAuth] getOpenSessions request', { posDeviceId })

  try {
    const res = await axios.get<CashSession[]>('/v1/cash-sessions', {
      params: { State: 'OPEN', posDeviceId }, // Sửa thành State viết hoa theo spec
    })

    // Đảm bảo kết quả là mảng
    const items = Array.isArray(res.data) ? res.data : []
    const openSessions = items.filter((s) => s.state === 'OPEN')

    console.log('[AppAuth] getOpenSessions OPEN', {
      count: openSessions.length,
      sample: openSessions[0] ? { id: openSessions[0].id, state: openSessions[0].state } : null,
    })

    return openSessions
  } catch (e) {
    console.log('[AppAuth] getOpenSessions OPEN failed', e)
    return []
  }
}

// 4. Custom Hook
export const useGetOpenSessions = (
  posDeviceId: string,
  options?: Omit<UseQueryOptions<GetOpenSessionsResponse, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: getOpenSessionsQueryKey(posDeviceId),
    queryFn: () => getOpenSessions(posDeviceId),
    enabled: Boolean(posDeviceId),
    ...options,
  })
}
