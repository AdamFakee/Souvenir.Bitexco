import { Staff } from './staff.type'

/**
 * Cặp token định danh người dùng
 */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

/**
 * Payload gửi lên để thực hiện đăng nhập
 */
export interface LoginPayload {
  username: string
  password: string
}

/**
 * Dữ liệu trả về sau khi đăng nhập thành công
 */
export interface LoginResponse {
  tokens: AuthTokens
  staff: Staff
  currentShiftId: string | null // ID ca làm việc hiện tại (nếu nhân viên đang trong ca)
}

/**
 * Payload làm mới token
 */
export interface RefreshTokenPayload {
  refreshToken: string
}
