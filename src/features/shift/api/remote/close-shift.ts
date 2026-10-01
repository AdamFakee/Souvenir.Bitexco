import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { CashSession, StateResponse } from '@/shared/types'

// 1. Types cục bộ cho endpoint
export interface CloseShiftPayload {
  action: 'start_close' | 'submit_count' | 'close' | 'resolve'
  expectedVersion: number
  countedCash?: number | null
  notes?: string | null
}

export type CloseShiftResponse = CashSession

// 2. API Function
export const closeShift = async (
  shiftId: string,
  payload: CloseShiftPayload,
): Promise<CloseShiftResponse> => {
  const axios = AxiosService.getInstance()
  const response = await axios.post<StateResponse<CashSession>>(
    `/v1/cash-sessions/${shiftId}/transitions`,
    payload,
  )
  return response.data.data
}

// 3. Custom Hook
export const useCloseShift = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ shiftId, payload }: { shiftId: string; payload: CloseShiftPayload }) =>
      closeShift(shiftId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
    },
  })
}
