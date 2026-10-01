import { AxiosService } from '@/shared/lib/axios/axios.service'
import { OrderStatus } from '@/shared/lib/database'
import { AgentType } from '@/shared/types'
import { incrementDailyOrderCount } from '../../utils'

export interface PosCartLine {
  variantId: string
  unitId: string
  qty: number
  unitPrice: number
  discountAmount: number
  /** Tỷ lệ thuế dạng thập phân: 0.1 = 10% */
  taxRate: number
  notes?: string
}

export type PosPaymentMethod = 'cash' | 'qr' | 'card' | 'qr_bidv' | 'card_bidv' | 'cong_no'

export interface PosPaymentRequest {
  method: PosPaymentMethod
  amount: number
  provider: string | null
  cardTerminalId: string | null
  cashTendered?: number
  cashChange?: number
}

export interface PosCheckoutRequest {
  cashSessionId: string
  customerId: string | null
  currency: string
  notes: string | null
  lines: PosCartLine[]
  payments: PosPaymentRequest[]
  voucherCode: string | null
  issueInvoice: boolean
  customerName: string | null
  customerTaxId: string | null
  customerAddress: string | null
  /** ID của HDV / Đối tác (nếu có). null = khách lẻ */
  affiliateId?: string | null
  /** ID đối tác công nợ (Đối tác) */
  partnerId?: string | null
  /** Key chống trùng lặp từ client */
  clientIdempotencyKey?: string | null
  /** Loại đối tượng: retail | collaborator | agent */
  agentType?: AgentType | null
}

export interface PosCheckoutResult {
  orderCode: string
  orderId: string
  subTotal: number
  discountTotal: number
  voucherDiscount: number
  taxTotal: number
  grandTotal: number
  paidTotal: number
  change: number
  status: OrderStatus
  payments?: {
    paymentId: string
    method: string
    amount: number
    state: string
  }[]
}

/**
 * Thanh toán atomic — gọi trực tiếp khi Online, không qua SQLite local.
 */
export async function checkoutRemote(payload: PosCheckoutRequest): Promise<PosCheckoutResult> {
  try {
    console.log('[checkoutRemote] Request Payload:', JSON.stringify(payload, null, 2))
    const res = await AxiosService.getInstance().post<PosCheckoutResult>(
      '/v1/pos/checkout',
      payload,
    )
    console.log('[checkoutRemote] Success Response:', JSON.stringify(res.data, null, 2))
    if (res.data && !(res.data as any).error) {
      incrementDailyOrderCount()
    }
    return res.data
  } catch (error: any) {
    console.error(
      '[checkoutRemote] RAW ERROR JSON:',
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
    )
    console.error(
      '[checkoutRemote] ERROR Response Data:',
      JSON.stringify(error?.response?.data, null, 2),
    )
    throw error
  }
}
