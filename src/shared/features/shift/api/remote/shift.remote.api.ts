import { IBaseResponse } from '@/shared/types/api'

export interface OpenShiftPayload {
  staffId: string
  startingCash: number
  deviceId?: string
}

export interface OpenShiftResponse {
  shiftId: string
}

export interface CloseShiftPayload {
  shiftId: string
  actualEndingCash: number
  discrepancyReason?: string
}

export interface ShiftStatistics {
  expectedEndingCash: number
}

/**
 * ShiftRemoteAPI - Quản lý Ca làm việc với Server (Remote-Only)
 */
export const ShiftRemoteAPI = {
  /**
   * Mở ca làm việc — nhận về shiftId để lưu vào session
   */
  openShift: async (payload: OpenShiftPayload): Promise<IBaseResponse<OpenShiftResponse>> => {
    console.log('ShiftRemoteAPI: Opening shift online...', payload)

    return {
      success: true,
      status_code: 200,
      message: 'Mở ca thành công',
      data: {
        shiftId: 'mock_shift_' + Date.now(),
      },
      meta: { timestamp: Date.now() },
      error: null,
    }
  },

  /**
   * Lấy số tiền mặt dự kiến trong ca để đối soát trước khi đóng
   */
  getShiftStatistics: async (shiftId: string): Promise<IBaseResponse<ShiftStatistics>> => {
    console.log('ShiftRemoteAPI: Getting expected cash for shift...', { shiftId })

    return {
      success: true,
      status_code: 200,
      message: 'Lấy số tiền dự kiến thành công',
      data: {
        expectedEndingCash: 1750000,
      },
      meta: { timestamp: Date.now() },
      error: null,
    }
  },

  /**
   * Đóng ca làm việc
   */
  closeShift: async (payload: CloseShiftPayload): Promise<IBaseResponse<null>> => {
    console.log('ShiftRemoteAPI: Closing shift online...', payload)

    return {
      success: true,
      status_code: 200,
      message: 'Đóng ca thành công',
      data: null,
      meta: { timestamp: Date.now() },
      error: null,
    }
  },
}
