import {
  OrderRemoteAPI,
  PosCartLine,
  PosCheckoutRequest,
} from '@/shared/features/order/api/remote/order.remote.api'
import { getOrderErrorMessage } from '@/shared/features/order/constants'
import type { AgentType, AppliedVoucher, CartItem } from '@/shared/features/pos'
import { assign, fromPromise, setup } from 'xstate'
import { printReceiptActor } from '../flows/print.actors'
import { calculateLineDiscount } from '../utils'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface DebtPaymentContext {
  total: number
  items: CartItem[]
  affiliateId: string | null
  agentType: AgentType | null
  shiftId: string
  discount: number
  appliedVoucher: AppliedVoucher | null
  printRef?: React.RefObject<any>
  savedOrder?: any | null
  notes?: string | null

  error: string | null
  /** Chặn double CONFIRM / double checkout */
  submitted: boolean
}

export type DebtPaymentEvent =
  | { type: 'START'; input?: DebtPaymentInput }
  | { type: 'CONFIRM' }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }

export type DebtPaymentInput = {
  total: number
  items: CartItem[]
  affiliateId: string | null
  agentType: AgentType | null
  shiftId: string
  discount: number
  appliedVoucher: AppliedVoucher | null
  printRef?: React.RefObject<any>
  note?: string | null
}

// ─── Machine ────────────────────────────────────────────────────────────────────

export const debtPaymentMachine = setup({
  types: {
    context: {} as DebtPaymentContext,
    events: {} as DebtPaymentEvent,
    input: {} as DebtPaymentInput,
  },
  actors: {
    checkoutDebt: fromPromise(async ({ input }: { input: DebtPaymentContext }) => {
      const lines: PosCartLine[] = input.items.map((item) => ({
        variantId: item.product.id || '',
        unitId: item.product.unitId || (item.product as any).unit_id || '---',
        qty: item.quantity,
        unitPrice: item.price ?? item.product.price ?? 0,
        discountAmount: 0,
        taxRate: item.product.taxRate ?? 8,
      }))

      const partnerId = input.agentType === 'agent' ? (input.affiliateId ?? null) : null
      const affiliateId = input.agentType !== 'agent' ? (input.affiliateId ?? null) : null
      const randomPart = Math.random().toString(36).slice(2)
      const clientIdempotencyKey = `checkout-${Date.now()}-${randomPart}`

      const payload: PosCheckoutRequest = {
        cashSessionId: input.shiftId || '---',
        customerId: null,
        currency: 'VND',
        notes: input.notes ?? null,
        lines,
        payments: [
          {
            method: 'cong_no',
            amount: input.total,
            provider: null,
            cardTerminalId: null,
          },
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

      const response = await OrderRemoteAPI.checkout(payload)
      if (!response || (response as any).error) {
        throw new Error((response as any).error ?? 'Lỗi ghi nợ từ server!')
      }
      return response
    }),
    printReceipt: printReceiptActor,
  },
}).createMachine({
  id: 'debtPayment',
  initial: 'idle',
  context: ({ input }) => ({
    total: input?.total ?? 0,
    items: input?.items ?? [],
    affiliateId: input?.affiliateId ?? null,
    agentType: input?.agentType ?? null,
    shiftId: input?.shiftId ?? '',
    discount: input?.discount ?? 0,
    appliedVoucher: input?.appliedVoucher ?? null,
    printRef: input?.printRef,
    notes: input?.note ?? null,
    savedOrder: null,
    error: null,
    submitted: false,
  }),
  states: {
    idle: {
      on: {
        START: {
          target: 'idle',
          actions: assign(({ event }) => {
            const inp = event.input
            if (!inp) return { submitted: false, error: null, savedOrder: null }
            return {
              total: inp.total ?? 0,
              items: inp.items ?? [],
              affiliateId: inp.affiliateId ?? null,
              agentType: inp.agentType ?? null,
              shiftId: inp.shiftId ?? '',
              discount: inp.discount ?? 0,
              appliedVoucher: inp.appliedVoucher ?? null,
              printRef: inp.printRef,
              notes: inp.note ?? null,
              savedOrder: null,
              error: null,
              submitted: false,
            }
          }),
        },
        CONFIRM: {
          target: 'checkingOut',
          // Chặn double-tap: chỉ checkout 1 lần
          guard: ({ context }) => !context.submitted,
          actions: assign({ submitted: true, error: null }),
        },
      },
    },

    checkingOut: {
      invoke: {
        id: 'checkoutDebt',
        src: 'checkoutDebt',
        input: ({ context }) => ({ ...context }),
        onDone: {
          target: 'preparingReceipt',
          actions: assign({
            savedOrder: ({ event }) => (event as any).output ?? null,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            submitted: false,
            error: ({ event }) => {
              const err = (event as any).error
              let errMsg = 'Lỗi ghi nợ'
              if (err && typeof err === 'object') {
                const axiosErr = err as any
                if (axiosErr.response?.data) {
                  const code = axiosErr.response.data.error || axiosErr.response.data.message
                  errMsg = getOrderErrorMessage(code) || code || errMsg
                }
              }
              if (errMsg === 'Lỗi ghi nợ' && err instanceof Error) {
                errMsg = err.message
              }
              return errMsg
            },
          }),
        },
      },
    },

    preparingReceipt: {
      after: {
        800: { target: 'printingReceipt' },
      },
    },

    printingReceipt: {
      invoke: {
        id: 'printReceipt',
        src: 'printReceipt',
        input: ({ context }) => ({ printRef: context.printRef }),
        onDone: { target: 'done' },
        onError: { target: 'done' },
      },
    },

    error: {
      on: {
        RETRY: {
          target: 'checkingOut',
          guard: ({ context }) => !context.submitted,
          actions: assign({ error: null, submitted: true }),
        },
        CANCEL: { target: 'idle', actions: assign({ error: null, submitted: false }) },
        START: {
          target: 'idle',
          actions: assign(({ event }) => {
            const inp = event.input
            if (!inp) return { error: null, submitted: false, savedOrder: null }
            return {
              total: inp.total ?? 0,
              items: inp.items ?? [],
              affiliateId: inp.affiliateId ?? null,
              agentType: inp.agentType ?? null,
              shiftId: inp.shiftId ?? '',
              discount: inp.discount ?? 0,
              appliedVoucher: inp.appliedVoucher ?? null,
              printRef: inp.printRef,
              notes: inp.note ?? null,
              savedOrder: null,
              error: null,
              submitted: false,
            }
          }),
        },
      },
    },

    done: {
      on: {
        START: {
          target: 'idle',
          actions: assign(({ event }) => {
            const inp = event.input
            if (!inp) return { error: null, submitted: false, savedOrder: null }
            return {
              total: inp.total ?? 0,
              items: inp.items ?? [],
              affiliateId: inp.affiliateId ?? null,
              agentType: inp.agentType ?? null,
              shiftId: inp.shiftId ?? '',
              discount: inp.discount ?? 0,
              appliedVoucher: inp.appliedVoucher ?? null,
              printRef: inp.printRef,
              notes: inp.note ?? null,
              savedOrder: null,
              error: null,
              submitted: false,
            }
          }),
        },
      },
    },
  },
})
