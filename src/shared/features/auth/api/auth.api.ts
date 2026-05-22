import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { Employee, DeviceInfo } from '../../app/types/app.types'

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
    const axios = AxiosService.getInstance()
    const response = await axios.post<LoginResponseData>('/v1/device/auth/login', data)
    return response.data
  },

  /**
   * 2.2 Làm mới token — đọc refresh token từ cookie
   */
  refresh: async (): Promise<{ accessToken: string }> => {
    const axios = AxiosService.getInstance()
    const response = await axios.post<{ accessToken: string }>('/v1/device/auth/refresh')
    return response.data
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
   */
  getMe: async (): Promise<Employee> => {
    const axios = AxiosService.getInstance()
    const response = await axios.get<Employee>('/v1/device/auth/me')
    return response.data
  },
}
