import { TenantConfig } from '@/shared/features/app/types/app.types'
import {
    OrderRemoteAPI,
    PosCartLine,
    PosCheckoutRequest,
} from '@/shared/features/order/api/remote/order.remote.api'
import { getOrderErrorMessage } from '@/shared/features/order/constants'
import { AgentType, AppliedVoucher, CartItem } from '@/shared/features/pos'
import { PrinterService } from '@/shared/services'
import { toast } from '@/shared/store/use-alert-store'
import React from 'react'
import { SnapshotFrom, assign, fromPromise, setup } from 'xstate'
import { createCancelOrderActor } from '../flows/cancel-order.actor'
import { calculateLineDiscount } from '../utils'
import {
    checkQrPaymentStatusActor,
    fetchQrActor,
    forceCaptureQrActor,
    voidPaymentActor,
} from '../flows/qr-collection.actors'
import { PAYMENT_ERROR_CODES, PaymentErrorCode, PaymentResult } from '../types'

export interface QRPaymentContext {
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

export type QRPaymentEvent =
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'CHECK_STATUS_NOW' }
  | { type: 'FORCE_COMPLETE' }
  | { type: 'START'; input?: QRPaymentInput }

export type QRPaymentInput = {
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
}

const MAX_RETRIES = 3
const POLL_INTERVAL_MS = 3000
const TOTAL_TIMEOUT_MS = 5 * 60 * 1000

/** POS sale: checkout → fetch QR → poll → print */
export const qrPaymentMachine = setup({
  types: {
    context: {} as QRPaymentContext,
    events: {} as QRPaymentEvent,
    input: {} as QRPaymentInput,
  },
  actors: {
    createOrder: fromPromise(async ({ input }: { input: QRPaymentContext }) => {
      const lines: PosCartLine[] = input.items.map((item) => {
        const variantId = item.product.id || ''
        const unitId = item.product.unitId || (item.product as any).unit_id || '---'
        return {
          variantId,
          unitId,
          qty: item.quantity,
          unitPrice: item.price ?? item.product.price ?? 0,
          discountAmount: 0,
          taxRate: item.product.taxRate ?? 8,
        }
      })
      const partnerId = input.agentType === 'agent' ? (input.affiliateId ?? null) : null
      const affiliateId = input.agentType !== 'agent' ? (input.affiliateId ?? null) : null
      const clientIdempotencyKey = `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const payload: PosCheckoutRequest = {
        cashSessionId: input.shiftId,
        customerId: null,
        currency: 'VND',
        notes: null,
        lines,
        payments: [
          {
            method: 'qr_bidv',
            amount: input.total ?? 0,
            provider: 'bidv',
            cardTerminalId: null,
          },
        ],
        voucherCode: input.appliedVoucher?.code || null,
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
        throw new Error((response as any).error || 'Khởi tạo đơn hàng QR thất bại!')
      }
      return {
        orderId: response.orderId,
        orderCode: response.orderCode,
        paymentId: response.payments?.[0]?.paymentId,
      }
    }),
    fetchQR: fetchQrActor,
    checkStatus: checkQrPaymentStatusActor,
    forceCaptureQr: forceCaptureQrActor,
    saveOrder: fromPromise(async ({ input }: { input: QRPaymentContext }) => {
      if (!input.orderId) throw new Error('Không tìm thấy mã đơn hàng!')
      return {
        source: 'online',
        id: input.billNumber ?? input.orderId,
        orderCode: input.billNumber ?? input.orderId,
      }
    }),
    voidPayment: voidPaymentActor,
    cancelOrder: createCancelOrderActor('cashier_cancelled_payment', 'qrPayment'),
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
    assignOrderId: assign(({ event }) => {
      const output = (event as any).output
      return {
        orderId: output.orderId,
        billNumber: output.orderCode,
        paymentId: output.paymentId,
      }
    }),
    assignQRData: assign({
      qrContent: ({ event }) =>
        (event as any).output?.qrPayload ?? (event as any).output?.qrUrl ?? null,
      expiresAt: ({ event }) => (event as any).output?.expiresAt ?? null,
      createdAt: ({ event }) => (event as any).output?.createdAt ?? null,
    }),
    recordError: assign({
      error: ({ event }) => {
        const err = (event as any).error
        let errMsg = 'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại!'
        if (err && typeof err === 'object') {
          const axiosErr = err as any
          if (axiosErr.response?.data) {
            const code = axiosErr.response.data.error || axiosErr.response.data.message
            errMsg = getOrderErrorMessage(code) || code || errMsg
          }
        }
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
          isOnline: true,
          orderId: context.orderId ?? context.savedOrder?.orderCode ?? undefined,
          referenceCode: context.billNumber ?? context.orderId ?? undefined,
        }) satisfies PaymentResult,
    }),
    triggerSync: () => {},
    assignTimeoutError: assign({
      error: () => 'Đã hết thời gian thanh toán QR. Vui lòng thử lại!',
      errorCode: () => PAYMENT_ERROR_CODES.TIMEOUT,
    }),
    notifyTimeout: () => {
      toast.error('Giao dịch đã hết hạn thanh toán (5 phút)')
    },
    notifyCancel: () => {},
  },
  delays: {
    POLL_INTERVAL: POLL_INTERVAL_MS,
    TOTAL_TIMEOUT: TOTAL_TIMEOUT_MS,
  },
}).createMachine({
  id: 'qrPayment',
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
    orderId: null,
    paymentId: null,
    qrContent: null,
    expiresAt: null,
    createdAt: null,
    billNumber: null,
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
        START: { target: 'creatingOrder', actions: 'resetContext' },
        CANCEL: { target: 'cancelingPayment' },
      },
    },
    creatingOrder: {
      invoke: {
        id: 'createOrder',
        src: 'createOrder',
        input: ({ context }) => context,
        onDone: { target: 'fetchingQR', actions: 'assignOrderId' },
        onError: { target: 'error', actions: 'recordError' },
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
        FORCE_COMPLETE: { target: '#qrPayment.forceCapturingPayment' },
      },
      initial: 'idle',
      states: {
        idle: {
          after: {
            POLL_INTERVAL: 'checking',
            TOTAL_TIMEOUT: {
              target: '#qrPayment.error',
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
                target: '#qrPayment.savingOrder',
                guard: ({ event }) => (event.output as any).state === 'CAPTURED',
              },
              {
                target: '#qrPayment.error',
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
            guard: ({ context }) => context.paymentId !== null && context.retryCount < MAX_RETRIES,
            actions: 'clearError',
          },
          {
            target: 'creatingOrder',
            guard: 'canRetry',
            actions: 'clearError',
          },
        ],
        CHECK_STATUS_NOW: {
          target: 'waitingForPayment.checking',
          guard: ({ context }) => context.paymentId !== null,
          actions: 'clearError',
        },
        FORCE_COMPLETE: { target: '#qrPayment.forceCapturingPayment' },
        CANCEL: { target: 'cancelingPayment' },
      },
    },
    success: {
      on: {
        START: { target: 'creatingOrder', actions: 'resetContext' },
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
        START: { target: 'creatingOrder', actions: 'resetContext' },
      },
    },
  },
})

export function getQrPaymentStatusLabel(state: SnapshotFrom<typeof qrPaymentMachine>): string {
  const { error } = state.context
  if (state.matches('idle')) return 'Sẵn sàng thanh toán'
  if (state.matches('creatingOrder')) return 'Đang khởi tạo đơn hàng...'
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
