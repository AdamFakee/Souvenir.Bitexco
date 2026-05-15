import { OrderLocalAPI } from '@/shared/features/order/api/local/order.local.api'
import type { AppliedVoucher, CartItem } from '@/shared/features/pos'
import { OrderModel } from '@/shared/lib/database/models'
import { PaymentMethod } from '@/shared/lib/database'
import { SyncService } from '@/shared/lib/database/sync/sync.service'
import { PrinterService } from '@/shared/services'
import { assign, fromPromise, setup } from 'xstate'
import { PaymentResult } from '../types'
import { calculateVoucherDiscount, roundCashAmount } from '../utils'

export interface CashPaymentContext {
  /** Input Data */
  total: number
  discount: number
  items: CartItem[]
  staffId: string
  shiftId: string
  sessionId: string
  appliedVoucher: AppliedVoucher | null
  printRef?: React.RefObject<any>

  /** Processing Data */
  amountTendered: number
  change: number
  error: string | null
  retryCount: number
  savedOrder: OrderModel | null
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
  printRef?: React.RefObject<any>
}

const MAX_RETRIES = 3

export const cashPaymentMachine = setup({
  types: {
    context: {} as CashPaymentContext,
    events: {} as CashPaymentEvent,
    input: {} as CashPaymentInput,
  },
  actors: {
    /**
     * Ghi nhận giao dịch tiền mặt vào DB local (Save Order)
     */
    saveOrder: fromPromise(
      async ({ input }: { input: CashPaymentContext }): Promise<OrderModel> => {
        const finalTotal = roundCashAmount(input.total)

        const checkoutPayload = {
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
          note: undefined, // Add if needed
          payment: {
            method: PaymentMethod.CASH,
            amount: input.amountTendered,
            cashTendered: input.amountTendered,
            cashChange: input.change,
            referenceCode: undefined,
          },
        }

        const savedOrder = await OrderLocalAPI.checkout(checkoutPayload)
        return savedOrder
      },
    ),

    /**
     * In hóa đơn.
     */
    printReceipt: fromPromise(async ({ input }: { input: { printRef?: React.RefObject<any> } }) => {
      if (!input.printRef?.current) {
        throw new Error('Có lỗi xảy ra khi in hóa đơn, vui lòng thử lại')
      }

      await new Promise((resolve) => setTimeout(resolve, 800))
      await PrinterService.printComponent(input.printRef)
    }),
  },
  guards: {
    canConfirm: ({ context }) => context.amountTendered >= roundCashAmount(context.total),
    canRetry: ({ context }) => context.retryCount < MAX_RETRIES,
  },
  actions: {
    setAmount: assign({
      amountTendered: ({ event }) => (event.type === 'SET_AMOUNT' ? event.amount : 0),
      change: ({ context, event }) => {
        if (event.type !== 'SET_AMOUNT') return context.change
        const roundedTotal = roundCashAmount(context.total)
        const diff = event.amount - roundedTotal
        return diff > 0 ? diff : 0
      },
    }),
    recordError: assign({
      error: ({ event }) => (event as any).error?.message ?? 'Lỗi không xác định',
      retryCount: ({ context }) => context.retryCount + 1,
    }),
    clearError: assign({ error: null }),
    resetContext: assign(({ event }) => {
      const baseContext = {
        amountTendered: 0,
        change: 0,
        error: null,
        retryCount: 0,
        savedOrder: null,
        paymentResult: null,
      }

      if (event.type === 'START' && event.input) {
        return {
          ...baseContext,
          total: event.input.total,
          discount: event.input.discount,
          items: event.input.items,
          staffId: event.input.staffId,
          shiftId: event.input.shiftId,
          sessionId: event.input.sessionId,
          appliedVoucher: event.input.appliedVoucher,
          printRef: event.input.printRef,
        }
      }

      return baseContext
    }),
    assignSavedOrder: assign({
      savedOrder: ({ event }) => (event as any).output ?? null,
    }),
    assignPaymentResult: assign({
      paymentResult: ({ context }) => ({
        success: true,
        method: PaymentMethod.CASH,
        paidAmount: context.amountTendered,
        change: context.change,
        isOnline: false,
        orderId: context.savedOrder?.id ?? undefined,
      }),
    }),
    triggerSync: () => {
      SyncService.performSync().catch((err) => console.error('Sync after Cash failed:', err))
    },
    notifyError: () => {}, // Sẽ được override từ UI (Popup)
    notifyCancel: () => {}, // Sẽ được override từ UI (Popup)
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
        SET_AMOUNT: {
          actions: 'setAmount',
        },
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
        input: ({ context }) => ({
          printRef: context.printRef,
        }),
        onDone: {
          target: 'success',
        },
        onError: {
          target: 'success', // Lỗi in không cản trở flow thành công
        },
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
