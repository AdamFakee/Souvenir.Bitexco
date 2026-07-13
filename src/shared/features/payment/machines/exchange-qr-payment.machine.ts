import { TenantConfig } from '@/shared/features/app/types/app.types'
import { AgentType, AppliedVoucher, CartItem } from '@/shared/features/pos'
import { PrinterService } from '@/shared/services'
import React from 'react'
import { SnapshotFrom, assign, fromPromise, setup } from 'xstate'
import { createCancelOrderActor } from '../flows/cancel-order.actor'
import {
  checkQrPaymentStatusActor,
  fetchQrActor,
  forceCaptureQrActor,
  voidPaymentActor,
} from '../flows/qr-collection.actors'
import { PAYMENT_ERROR_CODES, PaymentErrorCode, PaymentResult } from '../types'

export interface ExchangeQRPaymentContext {
  total: number
  discount: number
  items: CartItem[]
  staffId: string
  shiftId: string
  sessionId: string
  appliedVoucher: AppliedVoucher | null
  printRef?: React.RefObject<any>
  tenantConfig?: TenantConfig | null
  affiliateId?: string | null
  agentType?: AgentType | null
  orderId: string | null
  paymentId: string | null
  qrContent: string | null
  expiresAt: string | null
  createdAt?: string | null
  billNumber: string | null
  error: string | null
  errorCode: PaymentErrorCode | null
  retryCount: number
  savedOrder: any | null
  paymentResult: PaymentResult | null
  paymentState?: string | null
  paymentVersion?: number | null
}

export type ExchangeQRPaymentEvent =
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'CHECK_STATUS_NOW' }
  | { type: 'FORCE_COMPLETE' }
  | { type: 'START'; input: ExchangeQRPaymentInput }

/** Payment already INITIATED by exchangeOrder */
export type ExchangeQRPaymentInput = {
  total: number
  discount: number
  items: CartItem[]
  staffId: string
  shiftId: string
  sessionId: string
  appliedVoucher: AppliedVoucher | null
  printRef?: React.RefObject<any>
  tenantConfig?: TenantConfig | null
  affiliateId?: string | null
  agentType?: AgentType | null
  orderId: string
  paymentId: string
  billNumber: string
}

const MAX_RETRIES = 3
const POLL_INTERVAL_MS = 3000
const TOTAL_TIMEOUT_MS = 5 * 60 * 1000

/** Exchange difference: seed paymentId → fetch QR → poll → print (no checkout) */
export const exchangeQrPaymentMachine = setup({
  types: {
    context: {} as ExchangeQRPaymentContext,
    events: {} as ExchangeQRPaymentEvent,
    input: {} as ExchangeQRPaymentInput,
  },
  actors: {
    fetchQR: fetchQrActor,
    checkStatus: checkQrPaymentStatusActor,
    forceCaptureQr: forceCaptureQrActor,
    saveOrder: fromPromise(async ({ input }: { input: ExchangeQRPaymentContext }) => {
      if (!input.orderId) throw new Error('Không tìm thấy mã đơn hàng!')
      return {
        source: 'online',
        id: input.billNumber ?? input.orderId,
        orderCode: input.billNumber ?? input.orderId,
      }
    }),
    voidPayment: voidPaymentActor,
    cancelOrder: createCancelOrderActor(
      'cashier_cancelled_payment_during_exchange',
      'exchangeQrPayment',
    ),
    printReceipt: fromPromise(async ({ input }: { input: { printRef?: React.RefObject<any> } }) => {
      if (!input.printRef?.current) throw new Error('Không tìm thấy component in hóa đơn')
      await new Promise((resolve) => setTimeout(resolve, 800))
      await PrinterService.printComponent(input.printRef, { doubleCopy: true })
    }),
  },
  guards: {
    canRetry: ({ context }) => context.retryCount < MAX_RETRIES,
  },
  actions: {
    assignQRData: assign(({ event }) => {
      const output = (event as any).output
      return {
        qrContent: output?.qrPayload ?? output?.qrUrl ?? null,
        expiresAt: output?.expiresAt ?? null,
        createdAt: output?.createdAt ?? new Date().toISOString(),
      }
    }),
    recordError: assign({
      error: ({ event }) => {
        const err = (event as any).error
        let errMsg = 'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại!'
        if (
          errMsg === 'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại!' &&
          err instanceof Error
        ) {
          errMsg = err.message
        }
        return errMsg
      },
      errorCode: () => PAYMENT_ERROR_CODES.SYSTEM_ERROR,
      retryCount: ({ context }) => context.retryCount + 1,
    }),
    clearError: assign({ error: null, errorCode: null }),
    resetContext: assign(({ event }) => {
      const base = {
        orderId: null as string | null,
        paymentId: null as string | null,
        qrContent: null as string | null,
        expiresAt: null as string | null,
        createdAt: null as string | null,
        billNumber: null as string | null,
        error: null as string | null,
        errorCode: null as PaymentErrorCode | null,
        retryCount: 0,
        savedOrder: null as any,
        paymentResult: null as PaymentResult | null,
        paymentState: null as string | null,
        paymentVersion: null as number | null,
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
          tenantConfig: event.input.tenantConfig,
          affiliateId: event.input.affiliateId,
          agentType: event.input.agentType,
          orderId: event.input.orderId,
          paymentId: event.input.paymentId,
          billNumber: event.input.billNumber,
        }
      }
      return base
    }),
    assignSavedOrder: assign({
      savedOrder: ({ event }) => (event as any).output ?? null,
    }),
    assignPaymentResult: assign({
      paymentResult: ({ context }) =>
        ({
          success: true,
          method: 'qr_bidv',
          paidAmount: context.total,
          change: 0,
          referenceCode: context.billNumber ?? undefined,
          isOnline: true,
          orderId: context.orderId ?? undefined,
        }) satisfies PaymentResult,
    }),
    triggerSync: () => {},
    assignTimeoutError: assign({
      error: () => 'Đã hết thời gian chờ thanh toán (5 phút).',
      errorCode: () => PAYMENT_ERROR_CODES.TIMEOUT,
    }),
    notifyTimeout: () => {},
    notifyCancel: () => {},
  },
  delays: {
    POLL_INTERVAL: POLL_INTERVAL_MS,
    TOTAL_TIMEOUT: TOTAL_TIMEOUT_MS,
  },
}).createMachine({
  id: 'exchangeQrPayment',
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
    tenantConfig: input.tenantConfig,
    affiliateId: input.affiliateId,
    agentType: input.agentType,
    orderId: input.orderId,
    paymentId: input.paymentId,
    billNumber: input.billNumber,
    qrContent: null,
    expiresAt: null,
    createdAt: null,
    error: null,
    errorCode: null,
    retryCount: 0,
    savedOrder: null,
    paymentResult: null,
    paymentState: null,
    paymentVersion: null,
  }),
  states: {
    idle: {
      on: {
        START: { target: 'fetchingQR', actions: 'resetContext' },
        CANCEL: { target: 'cancelingPayment' },
      },
    },
    fetchingQR: {
      invoke: {
        id: 'fetchQR',
        src: 'fetchQR',
        input: ({ context }) => ({
          paymentId: context.paymentId ?? '',
          amount: context.total,
          orderCode: context.billNumber ?? '',
          tenantConfig: context.tenantConfig ?? null,
        }),
        onDone: { target: 'waitingForPayment', actions: 'assignQRData' },
        onError: { target: 'error', actions: 'recordError' },
      },
      on: {
        CANCEL: { target: 'cancelingPayment', actions: 'notifyCancel' },
      },
    },
    waitingForPayment: {
      on: {
        CANCEL: { target: 'cancelingPayment', actions: 'notifyCancel' },
        CHECK_STATUS_NOW: { target: '.checking' },
        FORCE_COMPLETE: { target: '#exchangeQrPayment.forceCapturingPayment' },
      },
      initial: 'idle',
      states: {
        idle: {
          after: {
            POLL_INTERVAL: 'checking',
            TOTAL_TIMEOUT: {
              target: '#exchangeQrPayment.error',
              actions: ['assignTimeoutError', 'notifyTimeout'],
            },
          },
          on: { CHECK_STATUS_NOW: 'checking' },
        },
        checking: {
          invoke: {
            id: 'checkStatus',
            src: 'checkStatus',
            input: ({ context }) => ({ paymentId: context.paymentId ?? '' }),
            onDone: [
              {
                target: '#exchangeQrPayment.savingOrder',
                guard: ({ event }) => (event.output as any).state === 'CAPTURED',
              },
              {
                target: '#exchangeQrPayment.error',
                guard: ({ event }) => ['FAILED', 'VOIDED'].includes((event.output as any).state),
                actions: assign({
                  error: ({ event }) =>
                    `Giao dịch đã bị ${(event.output as any).state === 'VOIDED' ? 'hủy' : 'thất bại'} trên server.`,
                  paymentState: ({ event }) => (event.output as any).state,
                  paymentVersion: ({ event }) => (event.output as any).version,
                }),
              },
              {
                target: 'idle',
                actions: assign({
                  paymentState: ({ event }) => (event.output as any).state,
                  paymentVersion: ({ event }) => (event.output as any).version,
                }),
              },
            ],
            onError: { target: 'idle' },
          },
        },
      },
    },
    forceCapturingPayment: {
      invoke: {
        id: 'forceCaptureQr',
        src: 'forceCaptureQr',
        input: ({ context }) => ({
          paymentId: context.paymentId ?? '',
          paymentVersion: context.paymentVersion ?? 1,
        }),
        onDone: {
          target: 'savingOrder',
          actions: assign({ paymentVersion: ({ event }) => event.output }),
        },
        onError: { target: 'error', actions: 'recordError' },
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
        onError: { target: 'error', actions: 'recordError' },
      },
    },
    preparingReceipt: {
      after: { 800: { target: 'printingReceipt' } },
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
        RETRY: [
          {
            target: 'fetchingQR',
            guard: 'canRetry',
            actions: 'clearError',
          },
        ],
        CHECK_STATUS_NOW: {
          target: 'waitingForPayment.checking',
          guard: ({ context }) => context.paymentId !== null,
          actions: 'clearError',
        },
        FORCE_COMPLETE: { target: '#exchangeQrPayment.forceCapturingPayment' },
        CANCEL: { target: 'cancelingPayment' },
      },
    },
    success: {
      on: {
        START: { target: 'fetchingQR', actions: 'resetContext' },
      },
    },
    cancelingPayment: {
      invoke: {
        id: 'voidPayment',
        src: 'voidPayment',
        input: ({ context }) => ({ paymentId: context.paymentId }),
        onDone: { target: 'cancellingOrder' },
        onError: { target: 'cancellingOrder' },
      },
    },
    cancellingOrder: {
      invoke: {
        id: 'cancelOrder',
        src: 'cancelOrder',
        input: ({ context }) => ({
          orderId: context.orderId,
          shiftId: context.shiftId,
          staffId: context.staffId,
        }),
        onDone: { target: 'cancelled' },
        onError: { target: 'cancelled' },
      },
    },
    cancelled: {
      on: {
        START: { target: 'fetchingQR', actions: 'resetContext' },
      },
    },
  },
})

export function getExchangeQrPaymentStatusLabel(
  state: SnapshotFrom<typeof exchangeQrPaymentMachine>,
): string {
  const { error } = state.context
  if (state.matches('idle')) return 'Sẵn sàng thanh toán'
  if (state.matches('fetchingQR')) return 'Đang lấy mã QR...'
  if (state.matches('waitingForPayment')) return 'Đang chờ khách quét mã thanh toán'
  if (state.matches('forceCapturingPayment')) return 'Đang xác nhận thủ công...'
  if (state.matches('savingOrder')) return 'Đang lưu giao dịch...'
  if (state.matches('printingReceipt')) return 'Đang in hóa đơn...'
  if (state.matches('success')) return 'Thanh toán thành công!'
  if (state.matches('error')) return error ?? 'Có lỗi xảy ra'
  if (state.matches('cancelingPayment')) return 'Đang hủy giao dịch thanh toán...'
  if (state.matches('cancellingOrder')) return 'Đang hủy đơn hàng trên hệ thống...'
  if (state.matches('cancelled')) return 'Giao dịch đã hủy'
  return 'Đang chuẩn bị...'
}
