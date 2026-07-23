import type { PaymentMethodCode } from '@/shared/features/payment/types/payment.constants'
import { PAYMENT_METHOD_LABELS } from '@/shared/features/payment/types/payment.constants'
import { OrderStatus } from '@/shared/lib/database'

/**
 * Trạng thái đơn hàng thực tế từ hệ thống quản lý kho/đơn hàng WMS.
 */
export type WmsOrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'FULFILLING'
  | 'FULFILLED'
  | 'INVOICED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD'
  | 'PAYMENT_PARTIAL'
  | 'RETURN_REQUESTED'
  | 'PARTIALLY_RETURNED'
  | 'PARTIALLY_REFUNDED'
  | 'RETURNED'
  | 'REFUNDED'
  | 'FAILED'

const RETURN_ELIGIBLE_STATUSES = ['PAID', 'FULFILLED', 'COMPLETED', 'CONFIRMED']

const BLOCKED_RETURN_STATUSES = ['CANCELLED', 'FAILED', 'RETURNED', 'REFUNDED']

export type RefundPaymentInstruction = 'pay_cash' | 'record_only'

export type RefundPaymentMethod = Extract<PaymentMethodCode, 'cash' | 'qr_bidv' | 'card_bidv'>

export interface RefundPaymentAllocation {
  method: RefundPaymentMethod
  amount: number
  instruction: RefundPaymentInstruction
  label: string
  note: string
}

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
  createdAt: Date | string
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

  const createdAtTime = new Date(order.createdAt).getTime()
  if (Number.isNaN(createdAtTime)) return false
  if (Date.now() - createdAtTime > 24 * 60 * 60 * 1000) return false

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
}): { label: string; color: string; bgColor: string } => {
  // 1. Đã hủy (FAILED)
  if (order.state === 'CANCELLED' || order.status === 'FAILED' || order.status === 'CANCELLED') {
    return { label: 'Đã hủy', color: '#DC2626', bgColor: '#FEE2E2' }
  }

  // 2. Hoàn trả hàng (REFUNDED)
  if (
    order.returnStatus === 'RETURNED' ||
    order.returnStatus === 'PARTIAL' ||
    order.status === 'REFUNDED' ||
    order.status === 'RETURNED' ||
    order.code?.startsWith('RT')
  ) {
    return { label: 'Hoàn hàng', color: '#2563EB', bgColor: '#DBEAFE' }
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
