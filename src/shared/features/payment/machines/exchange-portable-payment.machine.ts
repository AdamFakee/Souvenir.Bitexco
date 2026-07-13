import {
  OrderRemoteAPI,
  PosCheckoutResult,
} from '@/shared/features/order/api/remote/order.remote.api'
import type { AgentType, AppliedVoucher, CartItem } from '@/shared/features/pos'
import { SnapshotFrom, assign, fromPromise, setup } from 'xstate'
import {
  PAYMENT_ERROR_CODES,
  PaymentErrorCode,
  PaymentResult,
  PortablePaymentCommandResult,
} from '../types'

import {
  authorizePaymentActor,
  cancelPaymentActor,
  capturePaymentActor,
  cardCaptureActor,
  cardCaptureManualActor,
  connectPosActor,
  isCommunicationLossError,
  processPaymentActor,
  sendCardSaleCommandActor,
  verifyLastTransactionActor,
} from '../flows/card-collection.actors'
import { printReceiptActor } from '../flows/print.actors'

export interface ExchangePortablePaymentContext {
  total: number
  discount: number
  items: CartItem[]
  staffId: string
  shiftId: string
  sessionId: string
  appliedVoucher: AppliedVoucher | null
  printRef?: React.RefObject<any>
  affiliateId?: string | null
  agentType?: AgentType | null

  checkoutResult: PosCheckoutResult | null
  paymentId: string | null
  paymentVersion: number
  rawCommandResult: PortablePaymentCommandResult | null
  manualCardDetails: {
    terminalId?: string
    merchantId?: string
    referenceNumber?: string
    approvalCode?: string
  } | null
  error: string | null
  errorCode: PaymentErrorCode | null
  retryCount: number
  paymentResult: PaymentResult | null
}

export type ExchangePortablePaymentEvent =
  | { type: 'CONFIRM' }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'FORCE_COMPLETE' }
  | {
      type: 'MANUAL_CAPTURE'
      terminalId?: string
      merchantId?: string
      referenceNumber?: string
      approvalCode?: string
    }
  | { type: 'START'; input: ExchangePortablePaymentInput }

export type ExchangePortablePaymentInput = {
  total: number
  discount: number
  items: CartItem[]
  staffId: string
  shiftId: string
  sessionId: string
  appliedVoucher: AppliedVoucher | null
  printRef?: React.RefObject<any>
  affiliateId?: string | null
  agentType?: AgentType | null

  paymentId: string
  paymentVersion?: number
  checkoutResult: any
}

const MAX_RETRIES = 3
const PORTABLE_CMD_TIMEOUT_MS = 5 * 60 * 1000

export const exchangePortablePaymentMachine = setup({
  types: {
    context: {} as ExchangePortablePaymentContext,
    events: {} as ExchangePortablePaymentEvent,
    input: {} as ExchangePortablePaymentInput,
  },
  actors: {
    processPayment: processPaymentActor,
    connectPOS: connectPosActor,
    sendCommand: sendCardSaleCommandActor,
    verifyLastTransaction: verifyLastTransactionActor,
    cardCapture: cardCaptureActor,
    cardCaptureManual: cardCaptureManualActor,
    authorizePayment: authorizePaymentActor,
    capturePayment: capturePaymentActor,
    printReceipt: printReceiptActor,
    cancelPayment: cancelPaymentActor,
    cancelOrder: fromPromise(
      async ({
        input,
      }: {
        input: { orderId: string | null; shiftId: string; staffId: string }
      }): Promise<void> => {
        if (!input.orderId) return
        try {
          await OrderRemoteAPI.cancelOrder({
            orderId: input.orderId,
            shiftId: input.shiftId,
            staffId: input.staffId,
            reason: 'cashier_cancelled_payment_during_exchange',
          })
        } catch (err) {
          console.error('[exchangePortablePayment] cancelOrder error:', err)
        }
      },
    ),
  },
  guards: {
    canRetry: ({ context }) => context.retryCount < MAX_RETRIES,
    isCommunicationLoss: ({ event }) => isCommunicationLossError((event as any).error),
    hasOrderId: ({ context }) => context.checkoutResult?.orderId !== null,
  },
  actions: {
    recordError: assign({
      error: ({ event }) => {
        const err = (event as any).error
        return err instanceof Error ? err.message : 'Giao dịch qua máy POS thất bại!'
      },
      errorCode: () => PAYMENT_ERROR_CODES.SYSTEM_ERROR,
      retryCount: ({ context }) => context.retryCount + 1,
    }),
    assignTimeoutError: assign({
      error: () => 'Hết thời gian chờ quẹt thẻ trên máy EDC (5 phút).',
      errorCode: () => PAYMENT_ERROR_CODES.TIMEOUT,
    }),
    clearError: assign({ error: null, errorCode: null }),
    resetContext: assign(({ event }) => {
      const base = {
        checkoutResult: null,
        paymentId: null,
        paymentVersion: 1,
        rawCommandResult: null,
        manualCardDetails: null,
        error: null,
        errorCode: null,
        retryCount: 0,
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
          paymentId: event.input.paymentId,
          paymentVersion: event.input.paymentVersion ?? 1,
          checkoutResult: event.input.checkoutResult,
        }
      }
      return base
    }),
    assignPaymentVersion: assign({
      paymentVersion: ({ event }: { event: any }) => event.output,
    }),
    assignEdcResult: assign({
      rawCommandResult: ({ event }: { event: any }) => event.output,
    }),
    assignManualCardDetails: assign({
      manualCardDetails: ({ event }: { event: any }) => ({
        terminalId: event.terminalId,
        merchantId: event.merchantId,
        referenceNumber: event.referenceNumber,
        approvalCode: event.approvalCode,
      }),
    }),
    assignManualCaptureResult: assign({
      paymentVersion: ({ event }: { event: any }) => event.output?.paymentVersion,
    }),
    assignPaymentResult: assign({
      paymentResult: ({ context }) =>
        ({
          success: true,
          method: 'card_bidv',
          paidAmount: context.total,
          change: 0,
          referenceCode: context.checkoutResult?.orderId ?? context.paymentId ?? undefined,
          isOnline: true,
          orderId: context.checkoutResult?.orderId ?? undefined,
        }) satisfies PaymentResult,
    }),
  },
  delays: {
    PORTABLE_CMD_TIMEOUT: PORTABLE_CMD_TIMEOUT_MS,
  },
}).createMachine({
  id: 'exchangePortablePayment',
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
    affiliateId: input.affiliateId,
    agentType: input.agentType,
    paymentId: input.paymentId,
    paymentVersion: input.paymentVersion ?? 1,
    checkoutResult: input.checkoutResult,

    rawCommandResult: null,
    manualCardDetails: null,
    error: null,
    errorCode: null,
    retryCount: 0,
    paymentResult: null,
  }),
  states: {
    idle: {
      on: {
        CONFIRM: { target: 'processingPayment' },
        START: { target: 'idle', actions: 'resetContext' },
      },
    },

    processingPayment: {
      invoke: {
        id: 'processPayment',
        src: 'processPayment',
        input: ({ context }: { context: ExchangePortablePaymentContext }) => ({
          paymentId: context.paymentId!,
          paymentVersion: context.paymentVersion,
        }),
        onDone: {
          target: 'connecting',
          actions: 'assignPaymentVersion',
        },
        onError: {
          target: 'paymentFailed',
          actions: 'recordError',
        },
      },
    },

    connecting: {
      invoke: {
        id: 'connectPOS',
        src: 'connectPOS',
        onDone: { target: 'sendingCommand' },
        onError: {
          target: 'connectionFailed',
          actions: 'recordError',
        },
      },
      on: {
        MANUAL_CAPTURE: {
          target: 'capturingCardManual',
          actions: 'assignManualCardDetails',
        },
      },
    },

    connectionFailed: {
      on: {
        RETRY: {
          target: 'connecting',
          guard: 'canRetry',
          actions: 'clearError',
        },
        MANUAL_CAPTURE: {
          target: 'capturingCardManual',
          actions: 'assignManualCardDetails',
        },
        CANCEL: { target: 'cancelingPayment' },
      },
    },

    sendingCommand: {
      invoke: {
        id: 'sendCommand',
        src: 'sendCommand',
        input: ({ context }: { context: ExchangePortablePaymentContext }) => ({
          amount: context.total,
          paymentId: context.paymentId!,
        }),
        onDone: {
          target: 'capturingCard',
          actions: 'assignEdcResult',
        },
        onError: [
          {
            target: 'verifyingUnknown',
            guard: 'isCommunicationLoss',
          },
          {
            target: 'paymentFailed',
            actions: 'recordError',
          },
        ],
      },
      after: {
        PORTABLE_CMD_TIMEOUT: {
          target: 'verifyingUnknown',
          actions: ['assignTimeoutError', 'recordError'],
        },
      },
      on: {
        MANUAL_CAPTURE: {
          target: 'capturingCardManual',
          actions: 'assignManualCardDetails',
        },
      },
    },

    verifyingUnknown: {
      invoke: {
        id: 'verifyLastTransaction',
        src: 'verifyLastTransaction',
        input: ({ context }: { context: ExchangePortablePaymentContext }) => ({
          paymentId: context.paymentId!,
        }),
        onDone: {
          target: 'capturingCard',
          actions: 'assignEdcResult',
        },
        onError: {
          target: 'paymentFailed',
          actions: 'recordError',
        },
      },
      on: {
        MANUAL_CAPTURE: {
          target: 'capturingCardManual',
          actions: 'assignManualCardDetails',
        },
      },
    },

    capturingCard: {
      invoke: {
        id: 'cardCapture',
        src: 'cardCapture',
        input: ({ context }: { context: ExchangePortablePaymentContext }) => ({
          paymentId: context.paymentId!,
          edcResult: context.rawCommandResult!,
        }),
        onDone: {
          target: 'authorizingPayment',
          actions: 'assignPaymentVersion',
        },
        onError: {
          target: 'paymentFailed',
          actions: 'recordError',
        },
      },
    },

    capturingCardManual: {
      invoke: {
        id: 'cardCaptureManual',
        src: 'cardCaptureManual',
        input: ({ context }: { context: ExchangePortablePaymentContext }) => ({
          paymentId: context.paymentId!,
          manualDetails: context.manualCardDetails!,
        }),
        onDone: {
          target: 'authorizingPayment',
          actions: 'assignManualCaptureResult',
        },
        onError: {
          target: 'paymentFailed',
          actions: 'recordError',
        },
      },
    },

    authorizingPayment: {
      invoke: {
        id: 'authorizePayment',
        src: 'authorizePayment',
        input: ({ context }: { context: ExchangePortablePaymentContext }) => ({
          paymentId: context.paymentId!,
          paymentVersion: context.paymentVersion,
        }),
        onDone: {
          target: 'capturingPayment',
          actions: 'assignPaymentVersion',
        },
        onError: {
          target: 'manualResolution',
          actions: 'recordError',
        },
      },
    },

    capturingPayment: {
      invoke: {
        id: 'capturePayment',
        src: 'capturePayment',
        input: ({ context }: { context: ExchangePortablePaymentContext }) => ({
          paymentId: context.paymentId!,
          paymentVersion: context.paymentVersion,
        }),
        onDone: {
          target: 'preparingReceipt',
          actions: ['assignPaymentVersion', 'assignPaymentResult'],
        },
        onError: {
          target: 'manualResolution',
          actions: 'recordError',
        },
      },
    },

    manualResolution: {
      on: {
        FORCE_COMPLETE: { target: 'capturingPayment' },
        RETRY: { target: 'authorizingPayment', actions: 'clearError' },
        CANCEL: { target: 'cancelingPayment' },
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
        input: ({ context }: { context: ExchangePortablePaymentContext }) => ({
          printRef: context.printRef,
        }),
        onDone: { target: 'success' },
        onError: { target: 'success' },
      },
    },

    success: {
      type: 'final',
    },

    paymentFailed: {
      on: {
        RETRY: {
          target: 'connecting',
          guard: 'canRetry',
          actions: 'clearError',
        },
        MANUAL_CAPTURE: {
          target: 'capturingCardManual',
          actions: 'assignManualCardDetails',
        },
        CANCEL: { target: 'cancelingPayment' },
      },
    },

    cancelingPayment: {
      invoke: {
        id: 'cancelPayment',
        src: 'cancelPayment',
        input: ({ context }: { context: ExchangePortablePaymentContext }) => ({
          paymentId: context.paymentId!,
          paymentVersion: context.paymentVersion,
        }),
        onDone: { target: 'cancellingOrder' },
        onError: { target: 'cancellingOrder' },
      },
    },

    cancellingOrder: {
      invoke: {
        id: 'cancelOrder',
        src: 'cancelOrder',
        input: ({ context }: { context: ExchangePortablePaymentContext }) => ({
          orderId: context.checkoutResult?.orderId ?? null,
          shiftId: context.shiftId,
          staffId: context.staffId,
        }),
        onDone: { target: 'idle', actions: 'resetContext' },
        onError: { target: 'idle', actions: 'resetContext' },
      },
    },
  },
})

export function getExchangePortablePaymentStatusLabel(
  state: SnapshotFrom<typeof exchangePortablePaymentMachine>,
): string {
  const { error } = state.context
  if (state.matches('idle')) return 'Sẵn sàng quẹt thẻ'
  if (state.matches('processingPayment')) return 'Đang thiết lập thanh toán...'
  if (state.matches('connecting')) return 'Đang kết nối tới máy EDC...'
  if (state.matches('connectionFailed')) return 'Lỗi kết nối tới máy EDC'
  if (state.matches('sendingCommand')) return 'Vui lòng thao tác trên máy EDC'
  if (state.matches('verifyingUnknown')) return 'Đang kiểm tra kết quả giao dịch...'
  if (state.matches('capturingCard')) return 'Đang ghi nhận thông tin thẻ...'
  if (state.matches('capturingCardManual')) return 'Đang ghi nhận thông tin thẻ (thủ công)...'
  if (state.matches('authorizingPayment')) return 'Đang gửi yêu cầu thanh toán...'
  if (state.matches('capturingPayment')) return 'Đang đối soát giao dịch...'
  if (state.matches('manualResolution')) return 'Giao dịch cần đối soát thủ công'
  if (state.matches('preparingReceipt')) return 'Đang chuẩn bị in biên lai...'
  if (state.matches('printingReceipt')) return 'Đang in biên lai...'
  if (state.matches('success')) return 'Giao dịch thành công!'
  if (state.matches('paymentFailed')) return error ?? 'Thanh toán thất bại'
  if (state.matches('cancelingPayment')) return 'Đang hủy thanh toán...'
  if (state.matches('cancellingOrder')) return 'Đang hủy đơn hàng trên hệ thống...'
  return 'Đang xử lý...'
}
