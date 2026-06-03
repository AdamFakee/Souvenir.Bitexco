import { TenantConfig } from '@/shared/features/app/types/app.types'
import {
  OrderRemoteAPI,
  PosCartLine,
  PosCheckoutRequest,
} from '@/shared/features/order/api/remote/order.remote.api'
import { AppliedVoucher, CartItem } from '@/shared/features/pos'
import { PaymentMethod } from '@/shared/lib/database'
import { PrinterService } from '@/shared/services'
import { toast } from '@/shared/store/use-alert-store'
import React from 'react'
import { SnapshotFrom, assign, fromPromise, setup } from 'xstate'
import { PaymentRemoteAPI } from '../api/remote/payment.remote.api'
import { PaymentResult } from '../types'

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
  retryCount: number
  savedOrder: any | null
  paymentResult: PaymentResult | null
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
        const taxRate = (item.product.taxRate ?? 8) / 100

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

      console.log('[QR Checkout] Sending Checkout Payload:', JSON.stringify(payload, null, 2))
      const response = await OrderRemoteAPI.checkout(payload)
      console.log('[QR Checkout] Received Response:', JSON.stringify(response, null, 2))

      if (!response || (response as any).error) {
        throw new Error((response as any).error || 'Khởi tạo đơn hàng QR thất bại!')
      }

      const result = response
      const paymentId = result.payments?.[0]?.paymentId || `pay_${result.orderId}`

      return {
        orderId: result.orderId,
        orderCode: result.orderCode,
        paymentId,
      }
    }),

    /**
     * Sinh mã QR từ paymentId.
     */
    fetchQR: fromPromise(
      async ({
        input,
      }: {
        input: {
          paymentId: string
          total: number
          orderCode: string
          tenantConfig: TenantConfig | null
        }
      }) => {
        const params = {
          bankCode: input.tenantConfig?.bankCode || '---',
          accountNo: input.tenantConfig?.accountNo || '---',
          accountName: input.tenantConfig?.accountName || '---',
          amount: input.total,
          description: `Thanh toan don ${input.orderCode}`,
        }
        console.log('[QR Fetch] Generating QR with params:', JSON.stringify(params, null, 2))
        const qrData = await PaymentRemoteAPI.generateQrCode(input.paymentId, params)
        console.log('[QR Fetch] Received QR Response:', JSON.stringify(qrData, null, 2))
        return qrData
      },
    ),

    /**
     * Kiểm tra trạng thái thanh toán (Polling từ paymentId).
     */
    checkStatus: fromPromise(async ({ input }: { input: { paymentId: string } }) => {
      console.log('[QR Poll] Checking payment status for ID:', input.paymentId)
      const payment = await PaymentRemoteAPI.getPaymentStatus(input.paymentId)
      console.log(
        '[QR Poll] Current Payment State:',
        payment.state,
        'Full Data:',
        JSON.stringify(payment, null, 2),
      )
      if (payment.state !== 'CAPTURED') {
        throw new Error('NOT_CAPTURED_YET')
      }
      return payment
    }),

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
     * Hủy đơn hàng online trên server.
     */
    failOrder: fromPromise(
      async ({
        input,
      }: {
        input: { orderId: string | null; shiftId: string; staffId: string }
      }): Promise<void> => {
        if (!input.orderId) return
        try {
          console.log('[QR Payment] Cancelling order on server:', input.orderId)
          await OrderRemoteAPI.cancelOrder({
            orderId: input.orderId,
            shiftId: input.shiftId,
            staffId: input.staffId,
            reason: 'cashier_cancelled_payment',
          })
        } catch (err) {
          console.error('[QR Payment] Failed to cancel order:', err)
        }
      },
    ),

    /**
     * In hóa đơn.
     */
    printReceipt: fromPromise(async ({ input }: { input: { printRef?: React.RefObject<any> } }) => {
      if (!input.printRef?.current) {
        throw new Error('Không tìm thấy component in hóa đơn')
      }
      await new Promise((resolve) => setTimeout(resolve, 800))
      await PrinterService.printComponent(input.printRef)
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
        console.error('[QR Payment Machine Error] Captured event error:', err)
        let errMsg = 'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại!'
        if (err && typeof err === 'object') {
          const axiosErr = err as any
          if (axiosErr.response?.data) {
            console.error(
              '[QR Payment Machine Error] Axios Response Data:',
              JSON.stringify(axiosErr.response.data, null, 2),
            )
            errMsg = axiosErr.response.data.error || axiosErr.response.data.message || errMsg
          }
        }
        if (
          errMsg === 'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại!' &&
          err instanceof Error
        ) {
          errMsg = err.message
        }
        console.error('[QR Payment Machine Error] Processed message:', errMsg)
        return errMsg
      },
      retryCount: ({ context }) => context.retryCount + 1,
    }),
    clearError: assign({ error: null }),
    resetContext: assign(({ event }) => {
      const baseContext = {
        orderId: null,
        paymentId: null,
        qrContent: null,
        expiresAt: null,
        billNumber: null,
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
          tenantConfig: event.input.tenantConfig,
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
        method: PaymentMethod.BANK_TRANSFER,
        paidAmount: context.total,
        change: 0,
        isOnline: true,
        orderId: context.orderId ?? context.savedOrder?.orderCode ?? undefined,
        referenceCode: context.billNumber ?? context.orderId ?? undefined,
      }),
    }),
    triggerSync: () => {
      // Sync is not required for online-only orders, but we keep the callback signature
    },
    notifyTimeout: () => {
      toast.error('Giao dịch đã hết hạn thanh toán (5 phút)')
    },
    notifyCancel: () => {
      toast.info('Giao dịch đã bị hủy')
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
    retryCount: 0,
    savedOrder: null,
    paymentResult: null,
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
          total: context.total,
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
        FORCE_COMPLETE: { target: '#qrPayment.savingOrder' },
      },
      initial: 'idle',
      states: {
        idle: {
          after: {
            POLL_INTERVAL: 'checking',
            TOTAL_TIMEOUT: {
              target: '#qrPayment.cancelled',
              actions: 'notifyTimeout',
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
            onDone: {
              target: '#qrPayment.savingOrder',
            },
            onError: {
              target: 'idle',
            },
          },
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
          target: 'success', // Lỗi in không cản trở flow thành công
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
        FORCE_COMPLETE: { target: '#qrPayment.savingOrder' },
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
        id: 'failOrder',
        src: 'failOrder',
        input: ({ context }) => ({
          orderId: context.orderId,
          shiftId: context.shiftId,
          staffId: context.staffId,
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
  if (state.matches('savingOrder')) return 'Đang lưu giao dịch...'
  if (state.matches('printingReceipt')) return 'Đang in hóa đơn...'
  if (state.matches('success')) return 'Thanh toán thành công!'
  if (state.matches('error')) return error ?? 'Có lỗi xảy ra'
  if (state.matches('cancelled')) return 'Giao dịch đã hủy'
  return 'Đang chuẩn bị...'
}
