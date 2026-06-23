import { AxiosService } from '@/shared/lib/axios/axios.service'
import { type ShiftStatistics } from '@/shared/mocks/mock-data'
import { StateResponse } from '@/shared/types/api'

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

export const ShiftRemoteAPI = {
  getOpenSessions: async (posDeviceId: string): Promise<CashSession[]> => {
    const axios = AxiosService.getInstance()

    try {
      // 1. Kiểm tra ca ở trạng thái OPEN
      const openRes = await axios.get<CashSession[]>('/v1/cash-sessions', {
        params: { state: 'OPEN', posDeviceId },
      })
      if (openRes.data && openRes.data.length > 0) {
        return openRes.data
      }

      // 2. Kiểm tra ca ở trạng thái CLOSING
      const closingRes = await axios.get<CashSession[]>('/v1/cash-sessions', {
        params: { state: 'CLOSING', posDeviceId },
      })
      if (closingRes.data && closingRes.data.length > 0) {
        return closingRes.data
      }

      // 3. Kiểm tra ca ở trạng thái RECONCILING
      const reconcilingRes = await axios.get<CashSession[]>('/v1/cash-sessions', {
        params: { state: 'RECONCILING', posDeviceId },
      })
      if (reconcilingRes.data && reconcilingRes.data.length > 0) {
        return reconcilingRes.data
      }
    } catch {}

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
    const response = await axios.get<{ session: CashSession }>(`/v1/cash-sessions/${shiftId}`)
    return response.data.session
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
