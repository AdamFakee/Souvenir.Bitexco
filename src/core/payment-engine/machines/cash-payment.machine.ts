import { PrinterService, useConnectionStore } from '@/core/hardware'
import { checkoutLocal, checkoutRemote, PosCheckoutResult } from '@/features/order/api'
import { getOrderErrorMessage } from '@/features/order/constants'
import type { PaymentResult } from '@/features/payment/types'
import { calculateVoucherDiscount, roundCashAmount } from '@/features/payment/utils'
import type { AgentType, AppliedVoucher, CartItem } from '@/shared/types'
import { assign, fromPromise, setup } from 'xstate'
import { CheckoutPayloadBuilder } from '../services/checkout-payload.builder'

// ─── Saved Order Types ────────────────────────────────────────────────────────

/** Kết quả online checkout từ server — không ghi SQLite */
export type OnlineOrderResult = {
  source: 'online'
  orderId: string
  orderCode: string
}

/** Kết quả offline checkout từ SQLite — chờ WatermelonDB sync lên */
export type OfflineOrderResult = {
  source: 'offline'
  id: string
  createdAt: Date
}

export type SavedOrder = OnlineOrderResult | OfflineOrderResult

// ─── Machine Types ────────────────────────────────────────────────────────────

export interface CashPaymentContext {
  total: number
  discount: number
  items: CartItem[]
  staffId: string
  shiftId: string
  sessionId: string
  appliedVoucher: AppliedVoucher | null
  printRef?: React.RefObject<unknown>
  affiliateId?: string | null
  affiliateName?: string | null
  agentType?: AgentType | null
  notes?: string | null

  amountTendered: number
  change: number
  error: string | null
  retryCount: number
  savedOrder: SavedOrder | null
  paymentResult: PaymentResult | null
}

export type CashPaymentEvent =
  | { type: 'SET_AMOUNT'; amount: number }
  | { type: 'CONFIRM' }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'START'; input?: CashPaymentInput }

export type CashPaymentInput = {
  total: number
  discount: number
  items: CartItem[]
  staffId: string
  shiftId: string
  sessionId: string
  appliedVoucher: AppliedVoucher | null
  printRef?: React.RefObject<unknown>
  affiliateId?: string | null
  affiliateName?: string | null
  agentType?: AgentType | null
  note?: string | null
}

// ─── Machine ──────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3

export const cashPaymentMachine = setup({
  types: {
    context: {} as CashPaymentContext,
    events: {} as CashPaymentEvent,
    input: {} as CashPaymentInput,
  },
  actors: {
    /**
     * Lưu đơn hàng:
     * - Online  → gọi API atomic checkout (POST /v1/pos/checkout), không ghi SQLite
     * - Offline → ghi WatermelonDB SQLite local, WatermelonDB tự sync lên sau
     */
    saveOrder: fromPromise(
      async ({ input }: { input: CashPaymentContext }): Promise<SavedOrder> => {
        const finalTotal = roundCashAmount(input.total)
        const isOnline = useConnectionStore.getState().isNetworkConnected

        if (isOnline) {
          // ── ONLINE ─────────────────────────────────────────────────────────
          const payload = CheckoutPayloadBuilder.buildRequest({
            sessionId: input.sessionId || input.shiftId,
            items: input.items,
            payments: [
              {
                method: 'cash',
                amount: finalTotal || 0,
                provider: null,
                cardTerminalId: null,
                cashTendered: input.amountTendered,
                cashChange: input.change,
              },
            ],
            appliedVoucher: input.appliedVoucher,
            affiliateId: input.affiliateId,
            agentType: input.agentType,
            notes: input.notes,
          })

          const response = await checkoutRemote(payload)

          if (!response || (response as any).error) {
            throw new Error((response as any).error ?? 'Lỗi thanh toán trực tuyến từ server!')
          }

          const result: PosCheckoutResult = response
          return {
            source: 'online',
            orderId: result.orderId,
            orderCode: result.orderCode,
          }
        }

        // ── OFFLINE ────────────────────────────────────────────────────────────
        const partnerId = input.agentType === 'agent' ? (input.affiliateId ?? null) : null
        const partnerName = input.agentType === 'agent' ? (input.affiliateName ?? null) : null
        const affiliateId = input.agentType !== 'agent' ? (input.affiliateId ?? null) : null
        const affiliateName = input.agentType !== 'agent' ? (input.affiliateName ?? null) : null

        const savedOrder = await checkoutLocal({
          staffId: input.staffId,
          shiftId: input.shiftId,
          items: input.items,
          subtotal: input.total + input.discount,
          discount: input.discount,
          voucherCode: input.appliedVoucher?.code,
          voucherDiscount: input.appliedVoucher
            ? calculateVoucherDiscount(input.items, input.appliedVoucher)
            : 0,
          total: finalTotal,
          note: input.notes ?? undefined,
          payment: {
            method: 'cash',
            amount: finalTotal,
            cashTendered: input.amountTendered,
            cashChange: input.change,
            referenceCode: undefined,
          },
          affiliateId: affiliateId ?? undefined,
          affiliateName: affiliateName ?? undefined,
          partnerId: partnerId ?? undefined,
          partnerName: partnerName ?? undefined,
        })

        return {
          source: 'offline',
          id: savedOrder.id,
          createdAt: savedOrder.createdAt,
        }
      },
    ),

    /**
     * In hóa đơn.
     */
    printReceipt: fromPromise(
      async ({ input }: { input: { printRef?: React.RefObject<unknown> } }) => {
        if (!input.printRef?.current) {
          throw new Error('Có lỗi xảy ra khi in hóa đơn, vui lòng thử lại')
        }

        await new Promise((resolve) => setTimeout(resolve, 800))
        await PrinterService.printComponent(input.printRef, { doubleCopy: true })
      },
    ),
  },
  guards: {
    canConfirm: ({ context }) =>
      context.total > 0 &&
      context.total % 1000 === 0 &&
      context.amountTendered >= roundCashAmount(context.total) &&
      context.amountTendered % 1000 === 0,
    canRetry: ({ context }) => context.retryCount < MAX_RETRIES,
  },
  actions: {
    setAmount: assign({
      amountTendered: ({ event }) => (event.type === 'SET_AMOUNT' ? event.amount : 0),
      change: ({ context, event }) => {
        if (event.type !== 'SET_AMOUNT') return context.change
        const diff = event.amount - roundCashAmount(context.total)
        return diff > 0 ? diff : 0
      },
    }),
    recordError: assign({
      error: ({ event }) => {
        const err = (event as { error?: unknown }).error
        let errMsg = 'Lỗi không xác định'
        if (err && typeof err === 'object') {
          const axiosErr = err as any
          if (axiosErr.response) {
            const serverData = axiosErr.response.data
            if (serverData && typeof serverData === 'object') {
              const code = serverData.error || serverData.message
              errMsg = getOrderErrorMessage(code) || code || errMsg
            }
          }
        }
        if (errMsg === 'Lỗi không xác định' && err instanceof Error) {
          errMsg = err.message
        }
        return errMsg
      },
      retryCount: ({ context }) => context.retryCount + 1,
    }),
    clearError: assign({ error: null }),
    resetContext: assign(({ event }) => {
      const base = {
        amountTendered: 0,
        change: 0,
        error: null,
        retryCount: 0,
        savedOrder: null,
        paymentResult: null,
      }

      if (event.type === 'START' && event.input) {
        return {
          ...base,
          total: event.input.total,
          discount: event.input.discount,
          items: event.input.items,
          staffId: event.input.staffId,
          shiftId: event.input.shiftId,
          sessionId: event.input.sessionId,
          appliedVoucher: event.input.appliedVoucher,
          printRef: event.input.printRef,
          affiliateId: event.input.affiliateId,
          agentType: event.input.agentType,
          notes: event.input.note ?? null,
        }
      }

      return base
    }),
    assignSavedOrder: assign({
      savedOrder: ({ event }) => {
        const output = (event as { output?: unknown }).output
        return (output as SavedOrder) ?? null
      },
    }),
    assignPaymentResult: assign({
      paymentResult: ({ context }) =>
        ({
          success: true,
          method: 'cash',
          paidAmount: context.amountTendered,
          change: context.change,
          isOnline: context.savedOrder?.source === 'online',
          orderId:
            context.savedOrder?.source === 'online'
              ? context.savedOrder.orderCode
              : context.savedOrder?.id,
        }) satisfies PaymentResult,
    }),
    triggerSync: () => {
      // Chỉ có ý nghĩa khi offline — WatermelonDB push bản ghi SQLite lên server
    },
    notifyError: () => {},
    notifyCancel: () => {},
  },
}).createMachine({
  id: 'cashPayment',
  initial: 'idle',
  context: ({ input }) => ({
    total: input.total,
    discount: input.discount,
    items: input.items,
    staffId: input.staffId,
    shiftId: input.shiftId,
    sessionId: input.sessionId,
    appliedVoucher: input.appliedVoucher,
    printRef: input.printRef,
    notes: input.note ?? null,
    amountTendered: 0,
    change: 0,
    error: null,
    retryCount: 0,
    savedOrder: null,
    paymentResult: null,
  }),
  states: {
    idle: {
      on: {
        START: { actions: 'resetContext' },
        SET_AMOUNT: { actions: 'setAmount' },
        CONFIRM: {
          target: 'savingOrder',
          guard: 'canConfirm',
          actions: 'clearError',
        },
        CANCEL: { target: 'cancelled', actions: 'notifyCancel' },
      },
    },

    savingOrder: {
      invoke: {
        id: 'saveOrder',
        src: 'saveOrder',
        input: ({ context }) => context,
        onDone: {
          target: 'preparingReceipt',
          actions: ['assignSavedOrder', 'assignPaymentResult', 'triggerSync'],
        },
        onError: {
          target: 'error',
          actions: ['recordError', 'notifyError'],
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
        onDone: { target: 'success' },
        onError: { target: 'success' },
      },
    },

    error: {
      on: {
        RETRY: {
          target: 'savingOrder',
          guard: 'canRetry',
          actions: 'clearError',
        },
        CANCEL: { target: 'cancelled', actions: 'notifyCancel' },
      },
    },

    success: {
      on: {
        START: { target: 'idle', actions: 'resetContext' },
      },
    },

    cancelled: {
      on: {
        START: { target: 'idle', actions: 'resetContext' },
      },
    },
  },
})
