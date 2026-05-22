import { AxiosService } from '@/shared/lib/axios/axios.service'
import { PagedResponse, StateResponse } from '@/shared/types/api'
import { storage } from '@/shared/lib/storage'
import {
  MOCK_SESSIONS_EMPTY,
  MOCK_OPEN_SESSION,
  MOCK_SHIFT_STATISTICS,
  MOCK_CLOSE_SHIFT_RESPONSE,
  MOCK_SESSIONS_WITH_OPEN,
  type ShiftStatistics,
} from '@/shared/mocks/mock-data'

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
   * Response: PagedResponse<CashSession> (API v1.8)
   * TODO: Xoá mock khi API hoạt động
   */
  getOpenSessions: async (posDeviceId: string): Promise<PagedResponse<CashSession>> => {
    console.log('[ShiftRemoteAPI] Checking open sessions...', { posDeviceId })

    // ── MOCK (API đang lỗi) ───────────────────────────────────────────────
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Đọc trạng thái từ MMKV để dev control thay đổi linh hoạt
    const hasOpenShiftMock = storage.getBoolean('mock-has-open-shift')
    if (hasOpenShiftMock) {
      console.log('[ShiftRemoteAPI] Dynamic mock: Has OPEN shift active')
      return MOCK_SESSIONS_WITH_OPEN
    }
    console.log('[ShiftRemoteAPI] Dynamic mock: Empty sessions (No open shift)')
    return MOCK_SESSIONS_EMPTY
    // ── REAL ─────────────────────────────────────────────────────────────
    // const axios = AxiosService.getInstance()
    // const response = await axios.get<PagedResponse<CashSession>>('/v1/cash-sessions', {
    //   params: { state: 'OPEN', posDeviceId }
    // })
    // return response.data
  },

  /**
   * Mở ca làm việc
   * POST /v1/cash-sessions
   * TODO: Xoá mock khi API hoạt động
   */
  openShift: async (payload: OpenShiftPayload): Promise<CashSession> => {
    console.log('[ShiftRemoteAPI] Opening shift mock...', payload)

    // ── MOCK (API đang lỗi) ───────────────────────────────────────────────
    await new Promise((resolve) => setTimeout(resolve, 400))
    // Tự động lưu trạng thái mở ca vào MMKV để tắt app vào lại vẫn hoạt động đúng
    storage.set('mock-has-open-shift', true)

    return {
      ...MOCK_OPEN_SESSION,
      posDeviceId: payload.posDeviceId,
      openingCash: payload.openingCash,
      notes: payload.notes,
      openedAt: new Date().toISOString(),
    }
    // ── REAL ─────────────────────────────────────────────────────────────
    // const axios = AxiosService.getInstance()
    // const response = await axios.post<CashSession>('/v1/cash-sessions', payload)
    // return response.data
  },

  /**
   * Lấy số tiền mặt dự kiến trong ca để đối soát trước khi đóng
   * GET /v1/pos/quick-stats/{sessionId} hoặc custom endpoint
   * TODO: Xoá mock khi API hoạt động
   */
  getShiftStatistics: async (shiftId: string): Promise<ShiftStatistics> => {
    console.log('[ShiftRemoteAPI] Getting shift stats mock...', { shiftId })

    // ── MOCK (API đang lỗi) ───────────────────────────────────────────────
    await new Promise((resolve) => setTimeout(resolve, 300))
    return MOCK_SHIFT_STATISTICS
    // ── REAL ─────────────────────────────────────────────────────────────
    // const axios = AxiosService.getInstance()
    // const response = await axios.get<ShiftStatistics>(`/v1/cash-sessions/${shiftId}/statistics`)
    // return response.data
  },

  /**
   * Chuyển trạng thái ca (đóng ca)
   * POST /v1/cash-sessions/{id}/transitions
   * Response: StateResponse<CashSession> (API v1.8)
   * TODO: Xoá mock khi API hoạt động
   */
  closeShift: async (
    shiftId: string,
    payload: CloseShiftPayload,
  ): Promise<StateResponse<CashSession>> => {
    console.log('[ShiftRemoteAPI] Transitioning shift mock...', { shiftId, payload })

    // ── MOCK (API đang lỗi) ───────────────────────────────────────────────
    await new Promise((resolve) => setTimeout(resolve, 500))
    // Tự động xóa trạng thái mở ca khỏi MMKV sau khi đóng ca
    storage.set('mock-has-open-shift', false)

    return {
      ...MOCK_CLOSE_SHIFT_RESPONSE,
      data: {
        ...MOCK_CLOSE_SHIFT_RESPONSE.data,
        id: shiftId,
        countedCash: payload.countedCash,
        notes: payload.notes,
      },
    }
    // ── REAL ─────────────────────────────────────────────────────────────
    // const axios = AxiosService.getInstance()
    // const response = await axios.post<StateResponse<CashSession>>(
    //   `/v1/cash-sessions/${shiftId}/transitions`,
    //   payload
    // )
    // return response.data
  },
}
