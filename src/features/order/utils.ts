import { PAYMENT_METHOD_LABELS } from '@/features/payment/types/payment.constants'
import { OrderStatus } from '@/shared/lib/database'
import { storage } from '@/shared/lib/storage'
import type {
  RefundPaymentAllocation,
  RefundPaymentInstruction,
  RefundPaymentMethod,
  WmsOrderStatus,
} from './types'

const RETURN_ELIGIBLE_STATUSES = ['PAID', 'FULFILLED', 'COMPLETED', 'CONFIRMED']

const BLOCKED_RETURN_STATUSES = ['CANCELLED', 'FAILED', 'RETURNED', 'REFUNDED']

const REFUND_METHOD_META: Record<
  RefundPaymentMethod,
  { instruction: RefundPaymentInstruction; note: string }
> = {
  cash: {
    instruction: 'pay_cash',
    note: 'Thu ngân chi tiền mặt tại quầy — hệ thống trừ két ca hiện tại',
  },
  qr_bidv: {
    instruction: 'record_only',
    note: 'Chỉ ghi nhận — kế toán chuyển khoản thủ công sau',
  },
  card_bidv: {
    instruction: 'record_only',
    note: 'Chỉ ghi nhận — thu ngân void tay trên máy POS EDC',
  },
}

const normalizePaymentMethod = (raw?: string | null): string => {
  if (!raw) return ''
  const m = String(raw).toLowerCase()
  if (m === 'cash' || m === 'tiền mặt') return 'cash'
  if (m === 'qr_bidv' || m === 'qr' || m === 'qrcode') return 'qr_bidv'
  if (m === 'card_bidv' || m === 'card' || m === 'pos') return 'card_bidv'
  if (m === 'cong_no' || m === 'debt') return 'cong_no'
  if (m === 'mix' || m === 'mixed') return 'mix'
  return m
}

/**
 * Đơn đủ điều kiện trả hàng (full-order).
 * Voucher/KM luôn chặn, kể cả khi BE gửi canReturn: true.
 */
export const checkCanReturn = (order: {
  status?: WmsOrderStatus | OrderStatus | string | null
  state?: string | null
  canReturn?: boolean
  voucherCode?: string | null
  voucherDiscount?: number
  discount?: number
  returnStatus?: string | null
  paymentsSnapshot?: { method?: string | null }[] | null
  createdAt?: Date | string | null
}): boolean => {
  if (order.canReturn === false) return false

  if (order.voucherCode || (order.voucherDiscount ?? 0) > 0 || (order.discount ?? 0) > 0) {
    return false
  }

  if (order.returnStatus === 'RETURNED') return false

  const status = order.status || order.state || ''
  if (status && BLOCKED_RETURN_STATUSES.includes(status)) return false

  const payments = order.paymentsSnapshot || []
  if (payments.some((p) => normalizePaymentMethod(p.method) === 'cong_no')) {
    return false
  }

  if (status && !RETURN_ELIGIBLE_STATUSES.includes(status)) return false

  if (order.createdAt) {
    const createdAtTime = new Date(order.createdAt).getTime()
    if (Number.isNaN(createdAtTime)) return false
    if (Date.now() - createdAtTime > 24 * 60 * 60 * 1000) return false
  }

  return true
}

/**
 * Phân bổ hoàn tiền 100% theo paymentsSnapshot gốc (UI + validate).
 */
export const buildRefundPaymentsFromSnapshot = (
  payments: { method?: string | null; amount?: number }[] | null | undefined,
): { ok: true; items: RefundPaymentAllocation[] } | { ok: false; error: string } => {
  if (!payments || payments.length === 0) {
    return { ok: false, error: 'Đơn hàng không có thông tin phương thức thanh toán.' }
  }

  const items: RefundPaymentAllocation[] = []

  for (const payment of payments) {
    const method = normalizePaymentMethod(payment.method)
    const amount = Number(payment.amount || 0)

    if (amount <= 0) continue

    if (method === 'cong_no') {
      return { ok: false, error: 'Đơn công nợ không hỗ trợ trả hàng trên POS.' }
    }

    if (method === 'mix') {
      // Parent mix row without children — cannot allocate
      return {
        ok: false,
        error: 'Đơn hỗn hợp thiếu chi tiết phương thức thanh toán. Không thể trả hàng.',
      }
    }

    if (method !== 'cash' && method !== 'qr_bidv' && method !== 'card_bidv') {
      return { ok: false, error: `Phương thức thanh toán không hỗ trợ trả hàng: ${payment.method}` }
    }

    const meta = REFUND_METHOD_META[method]
    items.push({
      method,
      amount,
      instruction: meta.instruction,
      label: PAYMENT_METHOD_LABELS[method],
      note: meta.note,
    })
  }

  if (items.length === 0) {
    return { ok: false, error: 'Không có khoản thanh toán hợp lệ để hoàn.' }
  }

  return { ok: true, items }
}

/**
 * Đổi hàng: cùng base với trả hàng + trong 24h + không phải đơn đã đổi.
 */
export const checkCanExchange = (order: {
  status?: WmsOrderStatus | OrderStatus | string | null
  state?: string | null
  createdAt?: Date | string | null
  canReturn?: boolean
  canExchange?: boolean
  voucherCode?: string | null
  voucherDiscount?: number
  discount?: number
  returnStatus?: string | null
  paymentsSnapshot?: { method?: string | null }[] | null
  originalOrderId?: string | null
}): boolean => {
  if (order.canExchange === false) return false
  if (!checkCanReturn(order)) return false
  if (order.originalOrderId) return false

  if (order.createdAt) {
    const createdAtTime = new Date(order.createdAt).getTime()
    if (Number.isNaN(createdAtTime)) return false
    if (Date.now() - createdAtTime > 24 * 60 * 60 * 1000) return false
  }

  return true
}

/**
 * Lấy nhãn và màu sắc hiển thị rút gọn, chính xác cho Nhân viên bán hàng tại POS.
 */
export const getOrderDisplayStatus = (order: {
  state?: string | null
  status?: string | null
  paymentStatus?: string | null
  fulfillmentStatus?: string | null
  returnStatus?: string | null
  code?: string | null
  isExchange?: boolean | null
  isExchangeOrder?: boolean | null
}): { label: string; color: string; bgColor: string } => {
  // 1. Hủy đơn (FAILED / CANCELLED)
  if (order.state === 'CANCELLED' || order.status === 'FAILED' || order.status === 'CANCELLED') {
    return { label: 'Hủy đơn', color: '#64748B', bgColor: '#F1F5F9' }
  }

  // 2. Hoàn trả hàng (REFUNDED)
  if (order.status === 'REFUNDED' || order.status === 'RETURNED' || order.code?.startsWith('RT')) {
    return { label: 'Hủy đơn', color: '#DC2626', bgColor: '#FEE2E2' }
  }

  // Đổi hàng (EXCHANGE)
  if (order.status === 'EXCHANGE' || order.isExchange || order.isExchangeOrder) {
    return { label: 'Đổi hàng', color: '#2563EB', bgColor: '#DBEAFE' } // Blue
  }

  // 3. Hoàn thành (COMPLETED)
  if (
    order.state === 'COMPLETED' ||
    order.status === 'COMPLETED' ||
    order.fulfillmentStatus === 'FULFILLED' ||
    order.paymentStatus === 'PAID' ||
    order.paymentStatus === 'PARTIAL'
  ) {
    return { label: 'Hoàn thành', color: '#059669', bgColor: '#D1FAE5' }
  }

  // 4. Đang xử lý (PENDING) - Mọi trường hợp còn lại
  return { label: 'Đang xử lý', color: '#D97706', bgColor: '#FEF3C7' }
}

export const formatReceiptCode = (codeOrId: string | null | undefined): string => {
  if (!codeOrId) return '---'
  const isUuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(codeOrId)
  if (isUuid) {
    const clean = codeOrId.replace(/-/g, '')
    return clean.substring(0, 12).toUpperCase()
  }
  return codeOrId.toUpperCase()
}

const STORAGE_KEY_ORDER_COUNTER_DATE = 'offline_order_counter_date'
const STORAGE_KEY_ORDER_COUNTER_COUNT = 'offline_order_counter_count'

/**
 * Tăng số thứ tự (STT) đơn hàng trong ngày lên 1 (dùng chung cho cả Online và Offline).
 * Tự động reset STT về 1 khi bước sang ngày mới (DDMMYYYY).
 */
export const incrementDailyOrderCount = (now: Date = new Date()): number => {
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const currentDateStr = `${dd}${mm}${yyyy}`

  const storedDate = storage.getString(STORAGE_KEY_ORDER_COUNTER_DATE)
  let count = storage.getNumber(STORAGE_KEY_ORDER_COUNTER_COUNT) ?? 0

  if (storedDate !== currentDateStr) {
    count = 1
  } else {
    count += 1
  }

  storage.set(STORAGE_KEY_ORDER_COUNTER_DATE, currentDateStr)
  storage.set(STORAGE_KEY_ORDER_COUNTER_COUNT, count)

  return count
}

/**
 * Lấy số lượng đơn hàng hiện tại trong ngày (không tăng counter).
 */
export const getTodayOrderCount = (now: Date = new Date()): number => {
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const currentDateStr = `${dd}${mm}${yyyy}`

  const storedDate = storage.getString(STORAGE_KEY_ORDER_COUNTER_DATE)
  if (storedDate !== currentDateStr) {
    return 0
  }
  return storage.getNumber(STORAGE_KEY_ORDER_COUNTER_COUNT) ?? 0
}

/**
 * Sinh mã đơn hàng offline theo định dạng: SO-DDMMYYYY-ABSTT
 * - DDMMYYYY: Ngày tháng năm hiện tại
 * - AB: 2 ký tự ngẫu nhiên in hoa (A-Z)
 * - STT: Số thứ tự 3 chữ số (001 - 999), reset khi qua ngày mới
 */
export const generateOfflineOrderCode = (now: Date = new Date()): string => {
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const dateStr = `${dd}${mm}${yyyy}`

  const stt = incrementDailyOrderCount(now)
  const sttStr = String(stt).padStart(3, '0')

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const char1 = chars.charAt(Math.floor(Math.random() * chars.length))
  const char2 = chars.charAt(Math.floor(Math.random() * chars.length))
  const randomAB = `${char1}${char2}`

  return `SO-${dateStr}-${randomAB}${sttStr}`
}
