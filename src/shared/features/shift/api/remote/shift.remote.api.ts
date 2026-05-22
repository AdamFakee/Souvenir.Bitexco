import { AxiosService } from '@/shared/lib/axios/axios.service'
import { type ShiftStatistics } from '@/shared/mocks/mock-data'
import { PagedResponse, StateResponse } from '@/shared/types/api'

export interface OpenShiftPayload {
  posDeviceId: string
  openingCash: number
  notes?: string
}

export interface CashSession {
  id: string
  code: string
  posDeviceId: string
  cashierUserId: string
  state: 'OPEN' | 'CLOSING' | 'RECONCILING' | 'CLOSED'
  openedAt: string
  closedAt?: string | null
  openingCash: number
  countedCash?: number | null
  expectedCash?: number | null
  diffCash?: number | null
  notes?: string | null
  version: number
}

export interface CloseShiftPayload {
  action: 'start_close' | 'submit_count' | 'close' | 'resolve'
  expectedVersion: number
  countedCash?: number | null
  notes?: string | null
}

export const ShiftRemoteAPI = {
  /**
   * Kiểm tra ca đang mở của một thiết bị POS
   * GET /v1/cash-sessions?state=OPEN&posDeviceId={guid}
   */
  getOpenSessions: async (posDeviceId: string): Promise<CashSession[]> => {
    console.log('[ShiftRemoteAPI] Checking open sessions...', { posDeviceId })
    const axios = AxiosService.getInstance()
    const response = await axios.get<CashSession[]>('/v1/cash-sessions', {
      params: { state: 'OPEN', posDeviceId },
    })
    return response.data
  },

  /**
   * Mở ca làm việc
   * POST /v1/cash-sessions
   */
  openShift: async (payload: OpenShiftPayload): Promise<CashSession> => {
    console.log('[ShiftRemoteAPI] Opening shift...', payload)
    const axios = AxiosService.getInstance()
    const response = await axios.post<CashSession>('/v1/cash-sessions', payload)
    return response.data
  },

  /**
   * Lấy số tiền mặt dự kiến trong ca để đối soát trước khi đóng
   * Chi tiết ca: GET /v1/cash-sessions/{id}
   */
  getShiftStatistics: async (shiftId: string): Promise<ShiftStatistics> => {
    console.log('[ShiftRemoteAPI] Getting shift stats...', { shiftId })
    const axios = AxiosService.getInstance()
    const response = await axios.get<{ session: CashSession }>(`/v1/cash-sessions/${shiftId}`)
    const session = response.data.session
    return {
      expectedEndingCash: session.expectedCash ?? session.openingCash,
    }
  },

  /**
   * Chuyển trạng thái ca (đóng ca)
   * POST /v1/cash-sessions/{id}/transitions
   */
  closeShift: async (
    shiftId: string,
    payload: CloseShiftPayload,
  ): Promise<StateResponse<CashSession>> => {
    console.log('[ShiftRemoteAPI] Transitioning shift...', { shiftId, payload })
    const axios = AxiosService.getInstance()
    const response = await axios.post<StateResponse<CashSession>>(
      `/v1/cash-sessions/${shiftId}/transitions`,
      payload,
    )
    return response.data
  },
}
