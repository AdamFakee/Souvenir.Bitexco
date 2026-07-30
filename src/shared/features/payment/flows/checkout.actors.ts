import {
  OrderRemoteAPI,
  PosCartLine,
  PosCheckoutRequest,
  PosCheckoutResult,
} from '@/shared/features/order/api/remote/order.remote.api'
import type { AgentType, AppliedVoucher, CartItem } from '@/shared/features/pos'
import { fromPromise } from 'xstate'

export type MixMethod = 'qr' | 'card'

export type CreateMixCheckoutInput = {
  total: number
  items: CartItem[]
  sessionId: string
  appliedVoucher: AppliedVoucher | null
  affiliateId?: string | null
  agentType?: AgentType | null

  cashAmount: number
  nonCashAmount: number
  selectedMethod: MixMethod
  cardTerminalId?: string | null
  note?: string | null
}

export type CreateMixCheckoutOutput = {
  checkoutResult: PosCheckoutResult
  orderId: string
  orderCode: string
  nonCashPaymentId: string
  nonCashPaymentVersion: number
}

export const createMixCheckoutActor = fromPromise(
  async ({ input }: { input: CreateMixCheckoutInput }): Promise<CreateMixCheckoutOutput> => {
    const lines: PosCartLine[] = input.items.map((item) => ({
      variantId: item.product.id || '',
      unitId: item.product.unitId || (item.product as any).unit_id || '---',
      qty: item.quantity,
      unitPrice: item.price ?? item.product.price ?? 0,
      discountAmount: 0,
      taxRate: item.product.taxRate ?? 8,
    }))

    const nonCashMethod = input.selectedMethod === 'qr' ? 'qr_bidv' : 'card_bidv'

    const nonCashPayment =
      input.selectedMethod === 'qr'
        ? {
            method: 'qr_bidv' as const,
            amount: input.nonCashAmount,
            provider: 'bidv',
            cardTerminalId: null,
          }
        : {
            method: 'card_bidv' as const,
            amount: input.nonCashAmount,
            provider: 'card-bidv',
            cardTerminalId: input.cardTerminalId ?? null,
          }

    const partnerId = input.agentType === 'agent' ? (input.affiliateId ?? null) : null
    const affiliateId = input.agentType !== 'agent' ? (input.affiliateId ?? null) : null
    const randomPart = Math.random().toString(36).slice(2)
    const clientIdempotencyKey = `checkout-${Date.now()}-${randomPart}`

    const payload: PosCheckoutRequest = {
      cashSessionId: input.sessionId,
      customerId: null,
      currency: 'VND',
      notes: input.note ?? null,
      lines,
      payments: [
        {
          method: 'cash' as const,
          amount: input.cashAmount,
          provider: null,
          cardTerminalId: null,
        },
        nonCashPayment,
      ],
      voucherCode: input.appliedVoucher?.code ?? null,
      issueInvoice: false,
      customerName: null,
      customerTaxId: null,
      customerAddress: null,
      affiliateId,
      partnerId,
      clientIdempotencyKey,
      agentType: input.agentType ?? null,
    }

    const checkoutResult = await OrderRemoteAPI.checkout(payload)

    if (!checkoutResult || (checkoutResult as any).error) {
      throw new Error((checkoutResult as any).error ?? 'Không thể tạo đơn thanh toán hỗn hợp')
    }

    const nonCashPaymentResult = checkoutResult.payments?.find((p) => p.method === nonCashMethod)

    if (!nonCashPaymentResult?.paymentId) {
      throw new Error(`Server không trả paymentId cho ${nonCashMethod}`)
    }

    return {
      checkoutResult,
      orderId: checkoutResult.orderId,
      orderCode: checkoutResult.orderCode,
      nonCashPaymentId: nonCashPaymentResult.paymentId,
      nonCashPaymentVersion: (nonCashPaymentResult as any).version ?? 1,
    }
  },
)

export const cancelOrderActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      orderId: string | null
      shiftId: string
      staffId: string
      managerAuth?: { employeeCode: string; pin: string } | null
    }
  }): Promise<void> => {
    if (!input.orderId) return
    try {
      await OrderRemoteAPI.cancelOrder({
        orderId: input.orderId,
        shiftId: input.shiftId,
        staffId: input.staffId,
        reason: 'cashier_cancelled_payment',
        managerAuth: input.managerAuth || undefined,
      })
    } catch (err: any) {
      throw err
    }
  },
)
