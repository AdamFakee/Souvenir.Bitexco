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
    console.log('StaffRemoteAPI: Logging in...', payload.username)

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
    console.log('StaffRemoteAPI: Refreshing token...')

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
   * Lấy toàn bộ danh sách nhân viên từ Server (Dùng cho sync initial)
   */
  getAllStaffs: async (): Promise<Staff[]> => {
    console.log('StaffRemoteAPI: Loading staffs from mock-staff.json...')

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
    console.log('StaffRemoteAPI: Fetching changes (Pull)...', { lastPulledAt })

    return {
      staff: { created: [], updated: [], deleted: [] },
    }
  },

  pushChanges: async () => {
    // Không đẩy thay đổi lên vì Staff là read-only trên Client
  },
}
