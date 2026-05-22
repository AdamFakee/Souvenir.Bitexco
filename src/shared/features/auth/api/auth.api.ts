import { AxiosService } from '@/shared/lib/axios/axios.service'
import { storage } from '@/shared/lib/storage'
import type { Employee, DeviceInfo } from '../../app/types/app.types'
import { MOCK_LOGIN_RESPONSE, MOCK_REFRESH_RESPONSE, MOCK_EMPLOYEE } from '@/shared/mocks/mock-data'

/** Key MMKV — phải khớp với use-app-store.ts */
const APP_STORAGE_KEY = 'app-machine-persist'

export interface DeviceActivationRequest {
  deviceCode: string
  activationToken: string
}

export interface LoginRequest {
  deviceId: string
  employeeCode: string
  pin: string
}

/** Response 200 từ POST /v1/device/auth/login (API v1.8 — raw, không có wrapper) */
export interface LoginResponseData {
  accessToken: string
  employee: Employee
  device: DeviceInfo
}

export const AuthAPI = {
  /**
   * 1. Kích hoạt thiết bị (1 lần duy nhất)
   * Anonymous — không cần token
   */
  activateDevice: async (data: DeviceActivationRequest): Promise<DeviceInfo> => {
    const axios = AxiosService.getInstance()
    const response = await axios.post<DeviceInfo>('/v1/pos-devices/activate', data)
    return response.data
  },

  /**
   * 2.1 Đăng nhập nhân viên → JWT
   * Anonymous — không cần token
   * TODO: Xoá mock khi API hoạt động
   */
  login: async (data: LoginRequest): Promise<LoginResponseData> => {
    // ── MOCK (API đang lỗi) ───────────────────────────────────────────────
    await new Promise((resolve) => setTimeout(resolve, 600))
    return {
      ...MOCK_LOGIN_RESPONSE,
      // Ghi đè employeeCode theo input thực tế
      employee: { ...MOCK_LOGIN_RESPONSE.employee, employeeCode: data.employeeCode },
    }
    // ── REAL (uncomment khi API sẵn sàng) ────────────────────────────────
    // const axios = AxiosService.getInstance()
    // const response = await axios.post<LoginResponseData>('/v1/device/auth/login', data)
    // return response.data
  },

  /**
   * 2.2 Làm mới token — đọc refresh token từ cookie
   * TODO: Xoá mock khi API hoạt động (+ xử lý cookie/SecureStore với backend)
   */
  refresh: async (): Promise<{ accessToken: string }> => {
    // ── MOCK (API đang lỗi) ───────────────────────────────────────────────
    await new Promise((resolve) => setTimeout(resolve, 400))

    // Simulate đúng hành vi server:
    // - Nếu đã có employee đăng nhập trước (persist trong MMKV) → refresh thành công
    // - Nếu chưa (vừa activate thiết bị, chưa login lần nào) → 401 Unauthorized
    try {
      const raw = storage.getString(APP_STORAGE_KEY)
      if (raw) {
        const persisted = JSON.parse(raw)
        if (persisted?.employee) {
          console.log('[AuthAPI.refresh MOCK] Employee found in MMKV → refresh success')
          return MOCK_REFRESH_RESPONSE
        }
      }
    } catch {
      // parse lỗi → coi như chưa có session
    }

    console.log('[AuthAPI.refresh MOCK] No employee in MMKV → simulate 401')
    const err: any = new Error('Refresh token invalid or expired')
    err.response = { status: 401, data: { error: 'auth.refresh_token_expired' } }
    throw err
    // ── REAL ─────────────────────────────────────────────────────────────
    // const axios = AxiosService.getInstance()
    // const response = await axios.post<{ accessToken: string }>('/v1/device/auth/refresh')
    // return response.data
  },

  /**
   * 2.3 Đăng xuất — thu hồi refresh token
   */
  logout: async (): Promise<void> => {
    try {
      const axios = AxiosService.getInstance()
      await axios.post('/v1/device/auth/logout')
    } catch {
      // Logout luôn thành công ở phía client dù server lỗi
    }
  },

  /**
   * 2.4 Thông tin nhân viên hiện tại (dùng sau refresh để lấy permissions fresh)
   * TODO: Xoá mock khi API hoạt động
   */
  getMe: async (): Promise<Employee> => {
    // ── MOCK (API đang lỗi) ───────────────────────────────────────────────
    await new Promise((resolve) => setTimeout(resolve, 200))
    return MOCK_EMPLOYEE
    // ── REAL ─────────────────────────────────────────────────────────────
    // const axios = AxiosService.getInstance()
    // const response = await axios.get<Employee>('/v1/device/auth/me')
    // return response.data
  },
}
