import { seconds } from '../utils/time'

export type AppEnvironment = 'uat' | 'prod'

/**
 * CẤU HÌNH MÔI TRƯỜNG DẠNG TYPESCRIPT
 * Chuyển giữa 'uat' và 'prod' trực tiếp tại đây mà không cần file .env
 */
export const CURRENT_ENV: AppEnvironment = 'prod'

export const ENV_CONFIG = {
  uat: {
    name: 'UAT / Staging',
    apiBaseUrl: 'https://wms-api-uat.aidx.vn',
    invoiceBaseUrl: 'https://wms-api-uat.aidx.vn',
  },
  prod: {
    name: 'Production (Saigonskydeck)',
    apiBaseUrl: 'https://bsale-api.aidx.vn',
    invoiceBaseUrl: 'https://sinvoice.saigonskydeck.com:40443',
  },
} as const

// API Base URL cho Axios Client
export const API_BASE_URL = ENV_CONFIG[CURRENT_ENV].apiBaseUrl

// Base URL cho hệ thống xuất hoá đơn điện tử
export const INVOICE_BASE_URL = ENV_CONFIG[CURRENT_ENV].invoiceBaseUrl

/**
 * Tạo link QR xuất hoá đơn điện tử in lên bill
 * Format: {BASE}/inv?order={mã đơn}&a={tổng tiền}
 * @param orderCode Mã đơn in trên bill (SO-...)
 * @param grandTotal Tổng tiền đơn hàng (số nguyên)
 */
export const buildInvoiceQrUrl = (
  orderCode: string | null | undefined,
  grandTotal: number | null | undefined,
): string | null => {
  if (!orderCode) return null
  const amount = Math.round(grandTotal ?? 0)
  return `${INVOICE_BASE_URL}/inv?order=${encodeURIComponent(orderCode)}&a=${amount}`
}

export const API_QUERY_CONFIG = {
  // Request times out after 30s
  TIMEOUT: seconds(30),

  // Max retry attempts before failinga
  RETRY_COUNT: 2,
} as const

export const API_CONSTANT = {
  TIME_DEFAULT: {
    TIMEOUT_REQUEST: 30, // seconds
    TIME_LOGIN_DELAY: 15, // seconds
  },
  HTTP_STATUS_CODE: {
    SUCCESS: 200,
    CREATED: 201,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
}
