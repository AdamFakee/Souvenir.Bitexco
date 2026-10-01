import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { DeviceInfo, Employee } from '@/features/app'

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

const BODY_DELIVERY_HEADER = { 'X-Token-Delivery': 'body' } as const

/**
 * 2.1 Đăng nhập nhân viên → JWT + refreshToken (body-delivery mode)
 * Anonymous — không cần Bearer token
 * Header X-Token-Delivery: body → server trả refreshToken trong JSON, không set cookie
 */
export async function login(data: LoginRequest): Promise<LoginResponseData> {
  const axios = AxiosService.getInstance()
  const response = await axios.post<LoginResponseData>('/v1/device/auth/login', data, {
    headers: BODY_DELIVERY_HEADER,
  })
  return response.data
}
