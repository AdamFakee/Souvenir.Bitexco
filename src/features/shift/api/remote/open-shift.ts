import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { CashSession } from '@/shared/types'

// 1. Types cục bộ cho endpoint
export interface OpenShiftPayload {
  posDeviceId: string
  openingCash: number
  notes?: string
}

export type OpenShiftResponse = CashSession

// 2. API Function
export const openShift = async (payload: OpenShiftPayload): Promise<OpenShiftResponse> => {
  const axios = AxiosService.getInstance()
  const response = await axios.post<CashSession>('/v1/cash-sessions', payload)
  return response.data
}

// 3. Custom Hook
export const useOpenShift = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: openShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
    },
  })
}
