import { OrderLocalAPI } from '@/shared/features/order/api/local/order.local.api'
import {
  OrderRemoteAPI,
  PosCartLine,
  PosCheckoutRequest,
  PosCheckoutResult,
} from '@/shared/features/order/api/remote/order.remote.api'
import type { AppliedVoucher, CartItem } from '@/shared/features/pos'
import { PrinterService } from '@/shared/services'
import { useConnectionStore } from '@/shared/store/use-connection-store'
import { assign, fromPromise, setup } from 'xstate'
import { PaymentResult } from '../types'
import { calculateVoucherDiscount, roundCashAmount } from '../utils'

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
  /** Input Data */
  total: number
  discount: number
  items: CartItem[]
  staffId: string
  shiftId: string
  sessionId: string
  appliedVoucher: AppliedVoucher | null
  printRef?: React.RefObject<unknown>

  /** Processing Data */
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

          const lines: PosCartLine[] = input.items.map((item) => {
            const variantId = item.product.id || ''
            const unitId = item.product.unitId || (item.product as any).unit_id || '---'
            const qty = item.quantity
            const unitPrice = item.price || item.product.price
            const discountAmount = item.discountAmount ?? 0
            const taxRate = item.product.taxRate ?? 8

            return {
              variantId,
              unitId,
              qty,
              unitPrice,
              discountAmount,
              taxRate,
            }
          })

          const payload: PosCheckoutRequest = {
            cashSessionId: input.sessionId || '---',
            customerId: null,
            currency: 'VND',
            notes: null,
            lines,
            payments: [
              {
                method: 'cash',
                amount: finalTotal || 0,
                provider: null,
                cardTerminalId: null,
              },
            ],
            voucherCode: input.appliedVoucher?.code ?? null,
            issueInvoice: false,
            customerName: null,
            customerTaxId: null,
            customerAddress: null,
          }

          const response = await OrderRemoteAPI.checkout(payload)

          if (!response || (response as any).error) {
            console.log(response)
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
        const savedOrder = await OrderLocalAPI.checkout({
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
          note: undefined,
          payment: {
            method: 'cash',
            amount: input.amountTendered,
            cashTendered: input.amountTendered,
            cashChange: input.change,
            referenceCode: undefined,
          },
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
        await PrinterService.printComponent(input.printRef)
      },
    ),
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
              errMsg = serverData.error || serverData.message || errMsg
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
        }
      }

      return base
    }),
    assignSavedOrder: assign({
      // XState truyền output qua event.output — dùng unknown rồi cast
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
      // SyncService.performSync().catch(() => {})
    },
    notifyError: () => {}, // override từ UI
    notifyCancel: () => {}, // override từ UI
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
        onError: { target: 'success' }, // lỗi in không cản trở flow
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
