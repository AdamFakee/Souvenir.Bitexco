import { AxiosService } from '@/shared/lib/axios/axios.service'

const BODY_DELIVERY_HEADER = { 'X-Token-Delivery': 'body' } as const

/**
 * 2.3 Đăng xuất — thu hồi refresh token server-side (body-delivery mode)
 * Fire-and-forget: client xoá storage bất kể server response.
 */
export async function logout(refreshToken: string): Promise<void> {
  try {
    const axios = AxiosService.getInstance()
    await axios.post('/v1/device/auth/logout', { refreshToken }, { headers: BODY_DELIVERY_HEADER })
  } catch {
    // Logout luôn thành công ở phía client dù server lỗi
  }
}
