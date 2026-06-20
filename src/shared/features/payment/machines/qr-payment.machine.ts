import { TenantConfig } from '@/shared/features/app/types/app.types'
import {
  OrderRemoteAPI,
  PosCartLine,
  PosCheckoutRequest,
} from '@/shared/features/order/api/remote/order.remote.api'
import { AppliedVoucher, CartItem } from '@/shared/features/pos'

import { PrinterService } from '@/shared/services'
import { toast } from '@/shared/store/use-alert-store'
import React from 'react'
import { SnapshotFrom, assign, fromPromise, setup } from 'xstate'
import {
  checkQrPaymentStatusActor,
  fetchQrActor,
  forceCaptureQrActor,
  voidPaymentActor,
} from '../flows/qr-collection.actors'
import { PAYMENT_ERROR_CODES, PaymentErrorCode, PaymentResult } from '../types'

export interface QRPaymentContext {
  /** Input Data */
  total: number
  discount: number
  items: CartItem[]
  staffId: string
  shiftId: string
  sessionId: string
  appliedVoucher: AppliedVoucher | null
  printRef?: React.RefObject<any>
  tenantConfig?: TenantConfig | null

  /** Processing Data */
  orderId: string | null
  paymentId: string | null
  qrContent: string | null
  expiresAt: string | null
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
}

const MAX_RETRIES = 3
const POLL_INTERVAL_MS = 3000 // 3 giây (đặc tả API)
const TOTAL_TIMEOUT_MS = 5 * 60 * 1000 // 5 phút total for QR scanning

export const qrPaymentMachine = setup({
  types: {
    context: {} as QRPaymentContext,
    events: {} as QRPaymentEvent,
    input: {} as QRPaymentInput,
  },
  actors: {
    /**
     * Khởi tạo đơn hàng trên Server (Atomic Checkout).
     */
    createOrder: fromPromise(async ({ input }: { input: QRPaymentContext }) => {
      const lines: PosCartLine[] = input.items.map((item) => {
        const variantId = item.product.id || ''
        const unitId = item.product.unitId || (item.product as any).unit_id || '---'
        const qty = item.quantity
        const unitPrice = item.price ?? item.product.price ?? 0
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
      }

      const response = await OrderRemoteAPI.checkout(payload)

      if (!response || (response as any).error) {
        throw new Error((response as any).error || 'Khởi tạo đơn hàng QR thất bại!')
      }

      const result = response
      const paymentId = result.payments?.[0]?.paymentId

      return {
        orderId: result.orderId,
        orderCode: result.orderCode,
        paymentId,
      }
    }),

    /**
     * Sinh mã QR từ paymentId.
     */
    fetchQR: fetchQrActor,

    /**
     * Kiểm tra trạng thái thanh toán (Polling từ paymentId).
     */
    checkStatus: checkQrPaymentStatusActor,

    /**
     * Chuyển trạng thái cưỡng bức lên CAPTURED khi nhấn Force Complete.
     */
    forceCaptureQr: forceCaptureQrActor,

    /**
     * Trả về thông tin đơn hàng online thành công.
     */
    saveOrder: fromPromise(async ({ input }: { input: QRPaymentContext }) => {
      if (!input.orderId) throw new Error('Không tìm thấy mã đơn hàng!')
      return {
        source: 'online',
        id: input.billNumber ?? input.orderId,
        orderCode: input.billNumber ?? input.orderId,
      }
    }),

    /**
     * Hủy/Void giao dịch thanh toán QR trên server.
     */
    voidPayment: voidPaymentActor,

    /**
     * In hóa đơn.
     */
    printReceipt: fromPromise(async ({ input }: { input: { printRef?: React.RefObject<any> } }) => {
      if (!input.printRef?.current) {
        throw new Error('Không tìm thấy component in hóa đơn')
      }
      await new Promise((resolve) => setTimeout(resolve, 800))
      await PrinterService.printComponent(input.printRef, { doubleCopy: true })
    }),
  },
  guards: {
    canRetry: ({ context }) => context.retryCount < MAX_RETRIES,
    hasOrderId: ({ context }) => context.orderId !== null,
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
    }),
    recordError: assign({
      error: ({ event }) => {
        const err = (event as any).error
        let errMsg = 'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại!'
        if (err && typeof err === 'object') {
          const axiosErr = err as any
          if (axiosErr.response?.data) {
            errMsg = axiosErr.response.data.error || axiosErr.response.data.message || errMsg
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
      const baseContext = {
        orderId: null,
        paymentId: null,
        qrContent: null,
        expiresAt: null,
        billNumber: null,
        error: null,
        errorCode: null,
        retryCount: 0,
        savedOrder: null,
        paymentResult: null,
        paymentState: null,
        paymentVersion: null,
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
          tenantConfig: event.input.tenantConfig,
        }
      }

      return baseContext
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
    triggerSync: () => {
      // Sync is not required for online-only orders, but we keep the callback signature
    },
    assignTimeoutError: assign({
      error: () => 'Đã hết thời gian thanh toán QR. Vui lòng thử lại!',
      errorCode: () => PAYMENT_ERROR_CODES.TIMEOUT,
    }),
    notifyTimeout: () => {
      toast.error('Giao dịch đã hết hạn thanh toán (5 phút)')
    },
    notifyCancel: () => {
      // toast.info('Giao dịch đã bị hủy')
    },
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
        CANCEL: { target: 'cancelled' },
      },
    },

    creatingOrder: {
      invoke: {
        id: 'createOrder',
        src: 'createOrder',
        input: ({ context }) => context,
        onDone: {
          target: 'fetchingQR',
          actions: 'assignOrderId',
        },
        onError: {
          target: 'error',
          actions: 'recordError',
        },
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
        onDone: {
          target: 'waitingForPayment',
          actions: 'assignQRData',
        },
        onError: {
          target: 'error',
          actions: 'recordError',
        },
      },
      on: {
        CANCEL: { target: 'cancelled', actions: 'notifyCancel' },
      },
    },

    waitingForPayment: {
      on: {
        CANCEL: { target: 'cancelled', actions: 'notifyCancel' },
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
          on: {
            CHECK_STATUS_NOW: 'checking',
          },
        },
        checking: {
          invoke: {
            id: 'checkStatus',
            src: 'checkStatus',
            input: ({ context }) => ({
              paymentId: context.paymentId ?? '',
            }),
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
            onError: {
              target: 'idle',
            },
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
          actions: assign({
            paymentVersion: ({ event }) => event.output,
          }),
        },
        onError: {
          target: 'error',
          actions: 'recordError',
        },
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
          actions: 'recordError',
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
          target: 'success', // Lỗi in không cản trước flow thành công
        },
      },
    },

    error: {
      on: {
        RETRY: [
          // TH1: Đã có paymentId => Chỉ thử lại bước lấy mã QR
          {
            target: 'fetchingQR',
            guard: ({ context }) => context.paymentId !== null && context.retryCount < MAX_RETRIES,
            actions: 'clearError',
          },
          // TH2: Chưa có paymentId => Thử lại từ bước tạo đơn
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
        CANCEL: { target: 'cancelled' },
      },
    },

    success: {
      on: {
        START: { target: 'creatingOrder', actions: 'resetContext' },
      },
    },

    cancelled: {
      invoke: {
        id: 'voidPayment',
        src: 'voidPayment',
        input: ({ context }) => ({
          paymentId: context.paymentId,
        }),
      },
      on: {
        START: { target: 'creatingOrder', actions: 'resetContext' },
      },
    },
  },
})

/**
 * Lấy nhãn trạng thái hiển thị cho QR Payment
 */
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
  if (state.matches('cancelled')) return 'Giao dịch đã hủy'
  return 'Đang chuẩn bị...'
}
