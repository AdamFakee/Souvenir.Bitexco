import type { PaymentMethodCode } from '@/shared/types'

export interface RefundReceiptLine {
  productId: string
  sku?: string
  name: string
  orderedQty: number
  returnedQty: number
  remainingQty: number
  unitPrice: number
  lineRefundAmount: number
  isReturned: boolean
}

export interface RefundReceiptData {
  orderId: string
  orderCode?: string
  returnId?: string
  returnCode?: string
  reason: string
  refundedAt?: string
  refundAmount: number
  lines: RefundReceiptLine[]
}

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

export type RefundPaymentInstruction = 'pay_cash' | 'record_only'

export type RefundPaymentMethod = Extract<PaymentMethodCode, 'cash' | 'qr_bidv' | 'card_bidv'>

export interface RefundPaymentAllocation {
  method: RefundPaymentMethod
  amount: number
  instruction: RefundPaymentInstruction
  label: string
  note: string
}
