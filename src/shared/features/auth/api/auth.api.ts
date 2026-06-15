import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { DeviceInfo, Employee } from '../../app/types/app.types'

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

/** Response 200 từ POST /v1/device/auth/login (body-delivery mode, ADR-0022) */
export interface LoginResponseData {
  accessToken: string
  /** Opaque 32-byte base64url — NOT a JWT. Lưu vào encrypted storage. */
  refreshToken: string
  employee: Employee
  device: DeviceInfo
}

/** Response 200 từ POST /v1/device/auth/refresh */
export interface RefreshResponseData {
  accessToken: string
  /** Refresh token mới — bắt buộc ghi đè cái cũ ngay lập tức. */
  refreshToken: string
}

/**
 * Header bắt buộc cho tất cả auth endpoints khi chạy trên React Native.
 * Nếu thiếu header này server trả refreshToken: null và set cookie (vô dụng trên RN).
 */
const BODY_DELIVERY_HEADER = { 'X-Token-Delivery': 'body' } as const

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
   * 2.1 Đăng nhập nhân viên → JWT + refreshToken (body-delivery mode)
   * Anonymous — không cần Bearer token
   * Header X-Token-Delivery: body → server trả refreshToken trong JSON, không set cookie
   */
  login: async (data: LoginRequest): Promise<LoginResponseData> => {
    const axios = AxiosService.getInstance()
    const response = await axios.post<LoginResponseData>('/v1/device/auth/login', data, {
      headers: BODY_DELIVERY_HEADER,
    })
    return response.data
  },

  /**
   * 2.2 Làm mới access token — gửi refreshToken trong body (body-delivery mode)
   * Anonymous — không cần Bearer token
   * ⚠️ Rotation: server trả refreshToken MỚI → bắt buộc ghi đè cái cũ ngay lập tức.
   * ⚠️ Nếu server trả 401 → token hết hạn/bị revoke → wipe storage → PIN login.
   */
  refresh: async (refreshToken: string): Promise<RefreshResponseData> => {
    const axios = AxiosService.getInstance()
    const response = await axios.post<RefreshResponseData>(
      '/v1/device/auth/refresh',
      { refreshToken },
      { headers: BODY_DELIVERY_HEADER },
    )
    return response.data
  },

  /**
   * 2.3 Đăng xuất — thu hồi refresh token server-side (body-delivery mode)
   * Fire-and-forget: client xoá storage bất kể server response.
   */
  logout: async (refreshToken: string): Promise<void> => {
    try {
      const axios = AxiosService.getInstance()
      await axios.post(
        '/v1/device/auth/logout',
        { refreshToken },
        { headers: BODY_DELIVERY_HEADER },
      )
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

  /**
   * 2.5 Lấy thông tin ngữ cảnh thiết bị — kiểm tra isActive
   */
  getDeviceContext: async (): Promise<DeviceContextResponse> => {
    const axios = AxiosService.getInstance()
    const response = await axios.get<DeviceContextResponse>('/v1/pos/device-context')
    return response.data
  },
}

export interface DeviceContextResponse {
  deviceId: string
  deviceCode: string
  deviceName: string
  warehouseId: string
  isActive: boolean
}
