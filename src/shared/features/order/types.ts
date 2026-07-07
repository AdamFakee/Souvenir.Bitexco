import { ItemSnapshot, PaymentSnapshot, TaxInfo } from '@/shared/lib/database/types'
import { Affiliate } from '@/shared/features/pos'

export interface Partner {
  id: string
  code: string
  nameVi: string
  nameEn: string | null
  companyName: string
  taxId: string | null
  address: string | null
  representative: string | null
  representativeTitle: string | null
  phone: string | null
  email: string | null
  debtCode: string | null
  sapCode: string | null
  invoiceEmail: string | null
  otherEmail: string | null
  allowCredit: boolean
  creditLimit: number | null
  isActive: boolean
  version: number
}

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

export type OrderStatusType =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'FULFILLING'
  | 'INVOICED'
  | 'FULFILLED'
  | 'COMPLETED'
  | 'RETURNED'
  | 'REFUNDED'
  | 'PARTIALLY_RETURNED'
  | 'PARTIALLY_REFUNDED'
  | 'CANCELLED'
  | 'FAILED'

export type OrderState =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'FULFILLING'
  | 'INVOICED'
  | 'FULFILLED'
  | 'COMPLETED'
  | 'RETURNED'
  | 'REFUNDED'
  | 'PARTIALLY_RETURNED'
  | 'PARTIALLY_REFUNDED'
  | 'CANCELLED'
  | 'FAILED'
  | 'PROCESSING'

export type OrderPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'FAILED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_PARTIAL'

export type OrderFulfillmentStatus =
  | 'PENDING'
  | 'FULFILLED'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLING'
  | 'CANCELLED'

export type OrderInvoiceStatus = 'NONE' | 'PENDING' | 'ISSUED' | 'CANCELLED' | 'FAILED' | 'INVOICED'

export type OrderReturnStatus = 'NONE' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'RETURN_REQUESTED'

/**
 * IOrder - Standard interface for Orders used in the UI.
 * Compatible with both remote API response and local models.
 */
export interface IOrder {
  id: string
  code?: string | null
  shiftId: string
  staffId: string
  status: OrderStatusType
  state?: OrderState | null
  paymentStatus?: OrderPaymentStatus | null
  fulfillmentStatus?: OrderFulfillmentStatus | null
  invoiceStatus?: OrderInvoiceStatus | null
  returnStatus?: OrderReturnStatus | null
  subtotal: number
  discount: number
  voucherCode?: string
  voucherDiscount: number
  total: number
  totalTax: number
  paidTotal?: number
  note?: string
  refundReason?: string
  originalOrderId?: string
  originalOrderCode?: string | null
  customerTaxInfo: TaxInfo | null
  itemsSnapshot: ItemSnapshot[]
  paymentsSnapshot: PaymentSnapshot[]
  isDeleted: boolean
  canReturn: boolean
  createdAt: Date
  updatedAt: Date
  refund?: RefundReceiptData
  staffName?: string | null
  totalRefunded?: number
  refunds?: any[]
  agentType?: 'collaborator' | 'agent' | 'retail'
  affiliateId?: string | null
  partnerId?: string | null
  affiliate?: Affiliate | null
  partner?: Partner | null
}
