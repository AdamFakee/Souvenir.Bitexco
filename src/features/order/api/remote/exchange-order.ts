import { AxiosService } from '@/shared/lib/axios/axios.service'
import { RefundReceiptData } from '../../types'
import { PosCheckoutResult } from './checkout'
import { OrderApiError } from './order-api-error'

export interface ExchangeReturnLineRequest {
  variantId: string
  qty: number
}

export interface ExchangeReplacementLineRequest {
  variantId: string
  unitId: string
  qty: number
  unitPrice: number
  discountAmount: number
  taxRate: number
  notes?: string
}

export interface ExchangeOrderParams {
  orderId: string
  idempotencyKey: string
  reason: string
  shiftId: string
  staffId: string
  returnLines: ExchangeReturnLineRequest[]
  newLines: ExchangeReplacementLineRequest[]
  payments: {
    method: 'cash' | 'qr_bidv' | 'card_bidv'
    amount: number
    provider?: string | null
    cardTerminalId?: string | null
  }[]
  managerAuth?: {
    employeeCode: string
    pin: string
  } | null
}

export interface PosReturnResponse {
  returnId: string
  returnCode: string
  orderId: string
  orderCode: string
  refundAmount: number
  status: string
  receipt?: RefundReceiptData
}

export interface ExchangeSaleReceiptLine {
  lineId?: string
  variantId?: string
  productId?: string
  sku?: string
  name?: string
  productName?: string
  barcode?: string | null
  qty: number
  returnedQty?: number
  remainingQty?: number
  unitPrice: number
  discountAmount?: number
  taxRate?: number
  taxAmount?: number
  lineTotal: number
}

export interface ExchangeSaleReceipt {
  orderId: string
  orderCode: string
  state?: string
  createdAt?: string
  completedAt?: string
  issuedAt?: string
  reason?: string
  originalOrderId?: string
  originalOrderCode?: string
  customerId?: string | null
  cashierUserId?: string
  cashSessionId?: string
  warehouseId?: string
  subTotal: number
  discountTotal?: number
  voucherDiscount?: number
  taxTotal: number
  grandTotal: number
  paidTotal?: number
  roundingTotal?: number
  currency?: string
  change?: number
  lines: ExchangeSaleReceiptLine[]
  payments?: {
    paymentId?: string
    method?: string
    amount?: number
    state?: string
    provider?: string | null
    createdAt?: string
  }[]
  invoice?: {
    id?: string
    invoiceNo?: string | null
    state?: string
    issuedAt?: string | null
  }
}

export interface ExchangeOrderResult {
  originalOrderId: string
  originalOrderCode: string
  return: PosReturnResponse
  newOrder: PosCheckoutResult
  refundValue: number
  newOrderTotal: number
  difference: number
  receipt?: ExchangeSaleReceipt
}

/**
 * Đổi hàng online bằng endpoint atomic.
 */
export async function exchangeOrder(params: ExchangeOrderParams): Promise<ExchangeOrderResult> {
  const {
    orderId,
    idempotencyKey,
    reason,
    shiftId,
    staffId,
    returnLines,
    newLines,
    payments,
    managerAuth,
  } = params

  try {
    const payload = {
      idempotencyKey,
      reason,
      shiftId,
      staffId,
      returnLines,
      newLines,
      payments,
      currency: 'VND',
      ...(managerAuth
        ? {
            managerAuth: {
              employeeCode: managerAuth.employeeCode,
              pin: managerAuth.pin,
            },
          }
        : {}),
    }

    const response = await AxiosService.getInstance().post<ExchangeOrderResult>(
      `/v1/pos/orders/${orderId}/exchange`,
      payload,
    )
    return response.data
  } catch (error) {
    const typedError = error as {
      response?: { status?: number; data?: { error?: string; traceId?: string } }
      message?: string
    }
    const status = typedError?.response?.status
    const data = typedError?.response?.data
    const code = typeof data?.error === 'string' ? data.error : undefined
    const traceId = typeof data?.traceId === 'string' ? data.traceId : undefined

    throw new OrderApiError(code || typedError?.message || 'order.exchange_failed', {
      code,
      status,
      traceId,
    })
  }
}
