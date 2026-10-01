import { AxiosService } from '@/shared/lib/axios/axios.service'

/** Response 200 từ POST /v1/device/auth/refresh */
export interface RefreshResponseData {
  accessToken: string
  /** Refresh token mới — bắt buộc ghi đè cái cũ ngay lập tức. */
  refreshToken: string
}

const BODY_DELIVERY_HEADER = { 'X-Token-Delivery': 'body' } as const

/**
 * 2.2 Làm mới access token — gửi refreshToken trong body (body-delivery mode)
 * Anonymous — không cần Bearer token
 * ⚠️ Rotation: server trả refreshToken MỚI → bắt buộc ghi đè cái cũ ngay lập tức.
 * ⚠️ Nếu server trả 401 → token hết hạn/bị revoke → wipe storage → PIN login.
 */
export async function refreshToken(token: string): Promise<RefreshResponseData> {
  const axios = AxiosService.getInstance()
  const response = await axios.post<RefreshResponseData>(
    '/v1/device/auth/refresh',
    { refreshToken: token },
    { headers: BODY_DELIVERY_HEADER },
  )
  return response.data
}
