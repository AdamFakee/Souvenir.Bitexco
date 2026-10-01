export type ErrorCategory =
  | 'HARDWARE' // Lỗi thiết bị phần cứng (Máy in, Màn hình phụ, Máy quẹt thẻ EDC)
  | 'API' // Lỗi REST API Server (400, 404, 500)
  | 'NETWORK' // Lỗi mất kết nối mạng Internet / LAN / Socket Timeout
  | 'AUTH' // Lỗi hết hạn phiên làm việc, Token 401/403
  | 'VALIDATION' // Lỗi dữ liệu giỏ hàng, thông tin không hợp lệ
  | 'UNKNOWN'

export interface AppErrorParams {
  code: string
  category: ErrorCategory
  i18nKey: string // BẮT BUỘC 100% phải có Key đa ngôn ngữ
  i18nParams?: Record<string, any> // Tham số động truyền vào câu dịch
  userMessage?: string // Chuỗi tiếng Việt hiển thị fallback nếu thiếu từ điển
  rawDetails?: any // Lỗi Native / Axios chi tiết để dev debug
}

/**
 * Lớp Lỗi Chuẩn Hóa Đa Ngôn Ngữ dùng cho toàn bộ ứng dụng POS Production
 */
export class AppError extends Error {
  readonly code: string
  readonly category: ErrorCategory
  readonly i18nKey: string
  readonly i18nParams?: Record<string, any>
  readonly userMessage?: string
  readonly rawDetails?: any
  readonly timestamp: number

  constructor(params: AppErrorParams) {
    super(params.code)
    this.name = 'AppError'
    this.code = params.code
    this.category = params.category
    this.i18nKey = params.i18nKey
    this.i18nParams = params.i18nParams
    this.userMessage = params.userMessage
    this.rawDetails = params.rawDetails
    this.timestamp = Date.now()
  }
}
