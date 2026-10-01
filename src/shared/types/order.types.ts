import { ItemSnapshot, PaymentSnapshot, TaxInfo } from '@/shared/lib/database/types'
import type { Affiliate, Partner } from './partner.types'

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

export type OrderState = 'DRAFT' | 'CONFIRMED' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

export type OrderPaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'

export type OrderFulfillmentStatus = 'PENDING' | 'PARTIAL' | 'FULFILLED'

export type OrderInvoiceStatus = 'NONE' | 'PARTIAL' | 'INVOICED'

export type OrderReturnStatus = 'NONE' | 'PARTIAL' | 'RETURNED'

/**
 * IOrder - Standard interface for Orders used in the UI.
 * Compatible with both remote API response and local models.
 */
export interface IOrder {
  id: string
  code?: string | null
  shiftId: string
  staffId: string
  staffName?: string | null
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
  totalTax?: number
  paidTotal?: number
  note?: string
  isDeleted?: boolean
  items?: ItemSnapshot[]
  itemsSnapshot?: ItemSnapshot[]
  payments?: PaymentSnapshot[]
  paymentsSnapshot?: PaymentSnapshot[]
  taxInfo?: TaxInfo
  customerTaxInfo?: TaxInfo | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  offlineSynced?: boolean
  customerPhone?: string
  customerName?: string
  // Affiliate / Partner
  affiliateId?: string | null
  affiliateName?: string | null
  affiliate?: Affiliate | null
  partnerId?: string | null
  partnerName?: string | null
  partner?: Partner | null
  agentType?: string | null
  // Return / Exchange tracking
  isExchange?: boolean
  isExchangeOrder?: boolean
  originalOrderId?: string | null
  originalOrderCode?: string | null
  canReturn?: boolean
  canExchange?: boolean
  // Refund details
  refund?: any
  refunds?: any
  totalRefunded?: number
  refundReason?: string
}
