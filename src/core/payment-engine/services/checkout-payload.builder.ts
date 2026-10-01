import type { PosCartLine, PosCheckoutRequest, PosPaymentRequest } from '@/features/order/api'
import type { AgentType, AppliedVoucher, CartItem } from '@/shared/types'

export interface CreateCheckoutRequestOptions {
  sessionId: string
  items: CartItem[]
  payments: PosPaymentRequest[]
  appliedVoucher?: AppliedVoucher | null
  affiliateId?: string | null
  agentType?: AgentType | null
  notes?: string | null
  customerId?: string | null
  issueInvoice?: boolean
}

/**
 * CheckoutPayloadBuilder - Single Source of Truth cho việc đóng gói dữ liệu đơn hàng
 * gửi lên Server Backend (`PosCheckoutRequest`) hoặc lưu Database.
 */
export class CheckoutPayloadBuilder {
  /**
   * Chuyển đổi danh sách CartItem[] sang PosCartLine[] theo format chuẩn của POS API.
   */
  static toCartLines(items: CartItem[]): PosCartLine[] {
    return items.map((item) => {
      const variantId = item.product.id || ''
      const unitId = item.product.unitId || (item.product as any).unit_id || '---'
      const qty = item.quantity
      const unitPrice = item.price ?? item.product.price ?? 0
      const taxRate = item.product.taxRate ?? 0

      return {
        variantId,
        unitId,
        qty,
        unitPrice,
        discountAmount: item.discountAmount ?? 0,
        taxRate,
      }
    })
  }

  /**
   * Xây dựng PosCheckoutRequest hoàn chỉnh gửi tới POST /v1/pos/checkout.
   */
  static buildRequest(options: CreateCheckoutRequestOptions): PosCheckoutRequest {
    const {
      sessionId,
      items,
      payments,
      appliedVoucher,
      affiliateId,
      agentType,
      notes,
      customerId,
      issueInvoice = false,
    } = options

    const partnerId = agentType === 'agent' ? (affiliateId ?? null) : null
    const finalAffiliateId = agentType !== 'agent' ? (affiliateId ?? null) : null
    const randomPart = Math.random().toString(36).slice(2)
    const clientIdempotencyKey = `checkout-${Date.now()}-${randomPart}`

    return {
      cashSessionId: sessionId || '---',
      customerId: customerId ?? null,
      currency: 'VND',
      notes: notes ?? null,
      lines: this.toCartLines(items),
      payments,
      voucherCode: appliedVoucher?.code ?? null,
      issueInvoice,
      customerName: null,
      customerTaxId: null,
      customerAddress: null,
      affiliateId: finalAffiliateId,
      partnerId,
      clientIdempotencyKey,
      agentType: agentType ?? null,
    }
  }
}
