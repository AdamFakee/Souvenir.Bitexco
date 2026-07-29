import { AxiosService } from '@/shared/lib/axios/axios.service'
import { PullChangesParams } from '@/shared/lib/database/sync'
import { IBaseResponse } from '@/shared/types/api'
import {
  AuthTokens,
  LoginPayload,
  LoginResponse,
  RefreshTokenPayload,
  Staff,
  StaffRole,
} from '../../types'
import mockStaffData from './mock-staff.json'

export interface EmployeeItem {
  id: string
  displayName: string
  email: string
  status: 'active' | 'inactive'
}

/**
 * StaffRaw - Cấu trúc dữ liệu Nhân viên khớp với Backend/Database
 */
export interface StaffRaw {
  id: string
  username: string
  fullname: string
  role: StaffRole
  password: string
  is_active: boolean
  is_deleted: boolean
  created_at?: number
  updated_at?: number
}

/**
 * StaffSyncChanges - Cấu trúc các thay đổi của Nhân viên
 */
export interface StaffSyncChanges {
  staff: {
    created: StaffRaw[]
    updated: StaffRaw[]
    deleted: string[]
  }
}

/**
 * StaffRemoteAPI - Xử lý đồng bộ và Authentication nhân viên với Server
 */
export const StaffRemoteAPI = {
  /**
   * Đăng nhập từ xa bằng Username & Password
   */
  login: async (payload: LoginPayload): Promise<IBaseResponse<LoginResponse>> => {
    // GIẢ LẬP: Tìm nhân viên trong mock data
    const foundStaff = mockStaffData.staffs.find(
      (s: any) => s.username === payload.username && s.password === payload.password,
    )

    if (!foundStaff) {
      return {
        success: false,
        status_code: 401,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác',
        data: null,
        meta: null,
        error: { code: 'UNAUTHORIZED' },
      }
    }

    return {
      success: true,
      status_code: 200,
      message: 'Đăng nhập thành công',
      data: {
        tokens: {
          accessToken: 'mock_access_token_' + Date.now(),
          refreshToken: 'mock_refresh_token_' + Date.now(),
        },
        staff: {
          id: foundStaff.id,
          username: foundStaff.username,
          fullname: foundStaff.fullname,
          role: foundStaff.role as StaffRole,
          password: foundStaff.password,
          isActive: foundStaff.isActive,
          isDeleted: false,
        },
        currentShiftId: null, // Sẽ có ID nếu Backend báo nhân viên đang trong ca
      },
      meta: { timestamp: Date.now() },
      error: null,
    }
  },

  /**
   * Làm mới Access Token
   */
  refreshToken: async (payload: RefreshTokenPayload): Promise<IBaseResponse<AuthTokens>> => {
    return {
      success: true,
      status_code: 200,
      message: 'Làm mới token thành công',
      data: {
        accessToken: 'mock_access_token_refreshed_' + Date.now(),
        refreshToken: payload.refreshToken, // Thường sẽ trả về refresh token mới hoặc giữ nguyên
      },
      meta: { timestamp: Date.now() },
      error: null,
    }
  },

  /**
   * Lấy danh sách nhân viên.
   * - Có thể truyền shiftId dạng string (backwards compatibility) hoặc object chứa bộ lọc { shiftId, status, isPos, hasTransaction }.
   */
  getEmployees: async (
    paramsOrShiftId?:
      | string
      | { shiftId?: string; status?: string; isPos?: boolean; hasTransaction?: boolean },
  ): Promise<any> => {
    try {
      const axios = AxiosService.getInstance()
      let params: Record<string, any> = {}
      if (typeof paramsOrShiftId === 'string') {
        params.shiftId = paramsOrShiftId
      } else if (paramsOrShiftId && typeof paramsOrShiftId === 'object') {
        params = { ...paramsOrShiftId }
      }
      const response = await axios.get<any>('/v1/pos/employees', { params })
      return response.data
    } catch {
      return null
    }
  },

  /**
   * Lấy toàn bộ danh sách nhân viên từ Server (Dùng cho sync initial)
   */
  getAllStaffs: async (): Promise<Staff[]> => {
    return mockStaffData.staffs.map((s: any) => ({
      id: s.id,
      username: s.username,
      fullname: s.fullname,
      role: s.role as StaffRole,
      password: s.password,
      isActive: s.isActive,
      isDeleted: false,
    }))
  },

  fetchChanges: async ({ lastPulledAt }: PullChangesParams): Promise<any> => {
    return {
      staff: { created: [], updated: [], deleted: [] },
    }
  },

  pushChanges: async () => {
    // Không đẩy thay đổi lên vì Staff là read-only trên Client
  },
}
