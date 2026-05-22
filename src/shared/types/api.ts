/**
 * Trạng thái HTTP Status Code phổ biến
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
}

/**
 * Chi tiết lỗi chuyên sâu
 */
export interface IErrorDetail {
  code: string | number // Error code định nghĩa riêng hoặc status code
  details?: any // Thông tin chi tiết (ví dụ: validation errors)
}

/**
 * Cấu trúc Metadata chuẩn
 */
export interface IMeta {
  timestamp: number // Unix Timestamp (giây hoặc mili giây tùy thống nhất)
  [key: string]: any // Cho phép mở rộng thêm các thông tin khác
}

/**
 * Cấu trúc Base Response cho toàn bộ hệ thống
 * T là kiểu dữ liệu của 'data' (ví dụ: User, Order, Product[])
 */
export interface IBaseResponse<T> {
  success: boolean // Trạng thái thành công
  status_code: number // HTTP Status Code
  message: string // Thông báo
  data: T | null // Dữ liệu chính
  meta: IMeta | null // Thông tin bổ sung
  error: IErrorDetail | null // Chi tiết lỗi
}

/**
 * API v1.8 — Paged list response
 * Dùng cho GET /v1/cash-sessions, GET /v1/product-lookup, v.v.
 */
export interface PagedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

/**
 * API v1.8 — State machine transition response
 * Dùng cho POST .../transitions
 */
export interface StateResponse<T> {
  data: T
  currentState: string
  allowedActions: string[]
}

/**
 * API v1.8 — Error response body
 * error là error code dạng "module.reason", FE tự translate
 */
export interface ApiError {
  error: string
  traceId?: string
}
