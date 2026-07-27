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

export interface ZReportStaffItem {
  staffId: string
  staffName: string
  staffCode: string
  orderCount: number
  cashAmount: number
  qrAmount: number
  cardAmount: number
  totalRevenue: number
}

export interface ZReportResponse {
  session: CashSession
  cashierName: string
  cashierEmail: string
  posDeviceName: string
  posDeviceCode: string
  warehouseName: string
  warehouseCode: string
  orderCount: number
  refundCount: number
  paymentBreakdown: {
    method: string
    amount: number
  }[]
  staffs?: ZReportStaffItem[]
}

function unwrapSessions(data: unknown): CashSession[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.items)) return obj.items as CashSession[]
    if (Array.isArray(obj.data)) return obj.data as CashSession[]
    if (obj.data && typeof obj.data === 'object' && Array.isArray((obj.data as any).items)) {
      return (obj.data as any).items as CashSession[]
    }
    if (Array.isArray(obj.sessions)) return obj.sessions as CashSession[]
  }
  return []
}

export const ShiftRemoteAPI = {
  /**
   * Lấy ca đang mở (OPEN / CLOSING / RECONCILING).
   * ⚠️ Không nuốt lỗi mạng/auth — caller (refreshAuthFlow) cần throw để restoreOffline
   * giữ cashSessionId cache. Chỉ trả [] khi server trả 200 rỗng thật.
   */
  getOpenSessions: async (posDeviceId: string): Promise<CashSession[]> => {
    const axios = AxiosService.getInstance()
    console.log('[AppAuth] getOpenSessions request', { posDeviceId })

    const byState = async (state: 'OPEN' | 'CLOSING' | 'RECONCILING') => {
      const res = await axios.get<PagedResponse<CashSession> | CashSession[]>('/v1/cash-sessions', {
        params: { state, posDeviceId },
      })
      const items = unwrapSessions(res.data)
      console.log(`[AppAuth] getOpenSessions ${state}`, {
        count: items.length,
        rawType: Array.isArray(res.data) ? 'array' : typeof res.data,
        sample: items[0]
          ? { id: items[0].id, state: items[0].state, posDeviceId: items[0].posDeviceId }
          : null,
      })
      return items
    }

    const openSessions = await byState('OPEN')
    if (openSessions.length > 0) return openSessions

    const closingSessions = await byState('CLOSING')
    if (closingSessions.length > 0) return closingSessions

    const reconcilingSessions = await byState('RECONCILING')
    if (reconcilingSessions.length > 0) return reconcilingSessions

    // Fallback: list OPEN không filter device — JWT sau refresh đôi khi không bind device
    // khiến filter posDeviceId trả []. Match client-side.
    try {
      const res = await axios.get<PagedResponse<CashSession> | CashSession[]>('/v1/cash-sessions', {
        params: { state: 'OPEN' },
      })
      const all = unwrapSessions(res.data)
      const matched = all.filter((s) => !posDeviceId || s.posDeviceId === posDeviceId)
      console.log('[AppAuth] getOpenSessions OPEN fallback(no device filter)', {
        all: all.length,
        matched: matched.length,
        sample: matched[0]
          ? { id: matched[0].id, state: matched[0].state, posDeviceId: matched[0].posDeviceId }
          : all[0]
            ? { id: all[0].id, state: all[0].state, posDeviceId: all[0].posDeviceId }
            : null,
      })
      if (matched.length > 0) return matched
      // Không match device nhưng server vẫn còn OPEN session → trả all (dev/single-POS)
      if (all.length > 0) return all
    } catch (e) {
      console.log('[AppAuth] getOpenSessions fallback FAIL', e)
    }

    return []
  },

  /**
   * Mở ca làm việc
   * POST /v1/cash-sessions
   */
  openShift: async (payload: OpenShiftPayload): Promise<CashSession> => {
    const axios = AxiosService.getInstance()
    const response = await axios.post<CashSession>('/v1/cash-sessions', payload)
    return response.data
  },

  /**
   * Lấy chi tiết ca làm việc (để lấy version mới nhất)
   * GET /v1/cash-sessions/{id}
   */
  getShiftById: async (shiftId: string): Promise<CashSession> => {
    const axios = AxiosService.getInstance()
    const response = await axios.get<
      CashSession | { session: CashSession } | { data: CashSession }
    >(`/v1/cash-sessions/${shiftId}`)
    const raw = response.data as any
    const session: CashSession | undefined =
      raw?.session ?? raw?.data ?? (raw?.id ? raw : undefined)
    console.log('[AppAuth] getShiftById', {
      shiftId,
      rawKeys: raw && typeof raw === 'object' ? Object.keys(raw) : null,
      id: session?.id,
      state: session?.state,
      posDeviceId: session?.posDeviceId,
    })
    if (!session?.id) throw new Error(`getShiftById: invalid payload for ${shiftId}`)
    return session
  },

  /**
   * Lấy số tiền mặt dự kiến trong ca để đối soát trước khi đóng
   * Chi tiết ca: GET /v1/cash-sessions/{id}
   */
  getShiftStatistics: async (shiftId: string): Promise<ShiftStatistics> => {
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
   * Server trả về StateResponse<CashSession> — unwrap .data để lấy inner CashSession với .state đúng
   */
  closeShift: async (shiftId: string, payload: CloseShiftPayload): Promise<CashSession> => {
    const axios = AxiosService.getInstance()
    const response = await axios.post<StateResponse<CashSession>>(
      `/v1/cash-sessions/${shiftId}/transitions`,
      payload,
    )
    // StateResponse = { data: CashSession, currentState: string, allowedActions: string[] }
    // Trả về inner CashSession (có .state) thay vì toàn bộ StateResponse
    return response.data.data
  },

  /**
   * Lấy báo cáo Z-report
   * GET /v1/cash-sessions/{id}/z-report
   */
  getZReport: async (shiftId: string): Promise<ZReportResponse> => {
    const axios = AxiosService.getInstance()
    const response = await axios.get<ZReportResponse>(`/v1/cash-sessions/${shiftId}/z-report`)
    return response.data
  },
}
