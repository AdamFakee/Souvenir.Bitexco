import type { CartItem } from './cart.types'
import type { PaymentMethodCode } from './payment.types'
import type { PortablePaymentCommandResult } from '@/core/hardware'

export interface PosCartLine {
  variantId: string
  unitId: string
  qty: number
  unitPrice: number
  discountAmount: number
  taxRate: number
  notes?: string
}

export interface PosPaymentRequest {
  method: PosPaymentMethod
  amount: number
  cashTendered?: number
  cashChange?: number
  referenceCode?: string
  provider?: string | null
  cardTerminalId?: string | null
}

export type PosPaymentMethod =
  | 'cash'
  | 'qr_bidv'
  | 'card_bidv'
  | 'credit'
  | 'bank_transfer'
  | 'card'
  | string

export interface PosCheckoutRequest {
  shiftId?: string
  staffId?: string
  cashSessionId?: string | null
  customerId?: string | null
  warehouseId?: string | null
  currency?: string | null
  notes?: string | null
  items?: PosCartLine[]
  lines?: PosCartLine[]
  payments: PosPaymentRequest[]
  voucherCode?: string | null
  issueInvoice?: boolean
  customerName?: string | null
  customerTaxId?: string | null
  customerAddress?: string | null
  clientIdempotencyKey?: string | null
  agentType?: string | null
  affiliateId?: string | null
  partnerId?: string | null
}

export interface PosCheckoutResult {
  orderId: string
  orderCode: string
  subTotal: number
  discountTotal: number
  voucherDiscount: number
  taxTotal: number
  grandTotal: number
  change: number
  payments: {
    paymentId: string
    method: PosPaymentMethod
    amount: number
    state: string
    version: number
  }[]
  invoice?: {
    id: string
    invoiceNo: string
    state: string
  }
}

export interface CheckoutLocalPaymentPayload {
  method: PaymentMethodCode
  amount: number
  cashTendered?: number
  cashChange?: number
  referenceCode?: string
  portablePaymentResult?: PortablePaymentCommandResult
}

export interface CheckoutLocalPayload {
  staffId: string
  shiftId: string
  items: CartItem[]
  subtotal: number
  discount: number
  voucherCode?: string
  voucherDiscount: number
  total: number
  note?: string
  payment: CheckoutLocalPaymentPayload
  affiliateId?: string
  affiliateName?: string
  partnerId?: string
  partnerName?: string
}
