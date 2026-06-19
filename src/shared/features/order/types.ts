import { OrderStatus } from '@/shared/lib/database'
import { ItemSnapshot, PaymentSnapshot, TaxInfo } from '@/shared/lib/database/types'

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
 * IOrder - Standard interface for Orders used in the UI.
 * Compatible with both remote API response and local models.
 */
export interface IOrder {
  id: string
  shiftId: string
  staffId: string
  status: OrderStatus
  subtotal: number
  discount: number
  voucherCode?: string
  voucherDiscount: number
  total: number
  totalTax: number
  note?: string
  refundReason?: string
  originalOrderId?: string
  customerTaxInfo: TaxInfo | null
  itemsSnapshot: ItemSnapshot[]
  paymentsSnapshot: PaymentSnapshot[]
  isDeleted: boolean
  canReturn: boolean
  createdAt: Date
  updatedAt: Date
  refund?: RefundReceiptData
}
