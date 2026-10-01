import { cancelOrder, checkoutRemote, PosCheckoutResult } from '@/features/order/api'
import type { AgentType, AppliedVoucher, CartItem } from '@/shared/types'
import { fromPromise } from 'xstate'
import { CheckoutPayloadBuilder } from '../services/checkout-payload.builder'

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

    const payload = CheckoutPayloadBuilder.buildRequest({
      sessionId: input.sessionId,
      items: input.items,
      payments: [
        {
          method: 'cash' as const,
          amount: input.cashAmount,
          provider: null,
          cardTerminalId: null,
        },
        nonCashPayment,
      ],
      appliedVoucher: input.appliedVoucher,
      affiliateId: input.affiliateId,
      agentType: input.agentType,
      notes: input.note,
    })

    const checkoutResult = await checkoutRemote(payload)

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
      await cancelOrder({
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
