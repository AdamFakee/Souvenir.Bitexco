import { OrderLocalAPI } from '@/shared/features/order/api/local/order.local.api'
import type { AppliedVoucher, CartItem } from '@/shared/features/pos'
import { OrderModel } from '@/shared/lib/database/models'
import { PaymentMethod } from '@/shared/lib/database/models/payment'
import { PrinterService } from '@/shared/services'
import { SnapshotFrom, assign, fromPromise, setup } from 'xstate'
import { PaymentRemoteAPI } from '../api/remote/payment.remote.api'
import { PaymentResult } from '../types'
import { calculateVoucherDiscount } from '../utils'

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

  /** Processing Data */
  orderId: string | null
  qrContent: string | null
  billNumber: string | null
  error: string | null
  retryCount: number
  savedOrder: OrderModel | null
  paymentResult: PaymentResult | null
}

export type QRPaymentEvent =
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
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
}

const MAX_RETRIES = 3
const POLL_INTERVAL_MS = 5000

export const qrPaymentMachine = setup({
  types: {
    context: {} as QRPaymentContext,
    events: {} as QRPaymentEvent,
    input: {} as QRPaymentInput,
  },
  actors: {
    /**
     * Tạo đơn hàng trên Backend.
     */
    createOrder: fromPromise(async ({ input }: { input: QRPaymentContext }) => {
      const { orderId } = await PaymentRemoteAPI.createOrder({
        items: input.items,
        total: input.total,
        discount: input.discount,
        voucherCode: input.appliedVoucher?.code,
        staffId: input.staffId,
        shiftId: input.shiftId,
      })
      return orderId
    }),

    /**
     * Lấy nội dung mã QR từ Backend.
     */
    fetchQR: fromPromise(async ({ input }: { input: { orderId: string } }) => {
      return await PaymentRemoteAPI.getQrCode(input.orderId)
    }),

    /**
     * Kiểm tra trạng thái thanh toán (Polling).
     */
    checkStatus: fromPromise(async ({ input }: { input: { orderId: string } }) => {
      const response = await PaymentRemoteAPI.verifyPaymentTransaction(input.orderId)
      if (!response.isPaid) {
        throw new Error('NOT_PAID_YET')
      }
      return response
    }),

    /**
     * Lưu đơn hàng vào Local DB.
     */
    saveOrder: fromPromise(async ({ input }: { input: QRPaymentContext }): Promise<OrderModel> => {
      if (!input.orderId) throw new Error('Thanh toán thất bại!')

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
        total: input.total,
        note: undefined,
        payment: {
          method: PaymentMethod.BANK_TRANSFER,
          amount: input.total,
          cashTendered: 0,
          cashChange: 0,
          referenceCode: input.billNumber ?? input.orderId,
        },
      }

      // Ghi nhận thành công online (trừ tồn kho, cập nhật shift)
      await OrderLocalAPI.recordOnlineOrderSuccess(checkoutPayload)

      // Đồng bộ dữ liệu chi tiết đơn hàng từ server về local để có OrderModel chuẩn cho việc in ấn
      try {
        const syncData = await PaymentRemoteAPI.getOrderSyncData(input.orderId)
        await OrderLocalAPI.saveOrderSyncData(syncData)

        // Lấy lại order vừa lưu để trả về
        const order = await OrderLocalAPI.getOrderById(input.orderId)
        if (order) return order
      } catch (err) {
        console.error('[QR Checkout] Lỗi đồng bộ đơn hàng:', err)
      }

      // Fallback nếu đồng bộ lỗi
      return { id: input.orderId, total: input.total, itemsSnapshot: [] } as any
    }),

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
    assignOrderId: assign({
      orderId: ({ event }) => (event as any).output,
    }),
    assignQRData: assign({
      qrContent: ({ event }) => (event as any).output?.qrContent ?? null,
      billNumber: ({ event }) => (event as any).output?.billNumber ?? null,
    }),
    recordError: assign({
      error: ({ event }) =>
        (event as any).error?.message ??
        'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại!',
      retryCount: ({ context }) => context.retryCount + 1,
    }),
    clearError: assign({ error: null }),
    resetContext: assign(({ event }) => {
      const baseContext = {
        orderId: null,
        qrContent: null,
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
        orderId: context.orderId ?? context.savedOrder?.id ?? undefined,
        referenceCode: context.billNumber ?? context.orderId ?? undefined,
      }),
    }),
  },
  delays: {
    POLL_INTERVAL: POLL_INTERVAL_MS,
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
    orderId: null,
    qrContent: null,
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
          orderId: context.orderId ?? context.sessionId,
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
    },

    waitingForPayment: {
      on: {
        CANCEL: { target: 'cancelled' },
      },
      initial: 'idle',
      states: {
        idle: {
          after: {
            POLL_INTERVAL: 'checking',
          },
        },
        checking: {
          invoke: {
            id: 'checkStatus',
            src: 'checkStatus',
            input: ({ context }) => ({
              orderId: context.orderId ?? context.sessionId,
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
          actions: ['assignSavedOrder', 'assignPaymentResult'],
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
          {
            target: 'fetchingQR',
            guard: ({ context }) => context.orderId !== null && context.retryCount < MAX_RETRIES,
            actions: 'clearError',
          },
          {
            target: 'creatingOrder',
            guard: 'canRetry',
            actions: 'clearError',
          },
        ],
        CANCEL: { target: 'cancelled' },
      },
    },

    success: {
      on: {
        START: { target: 'creatingOrder', actions: 'resetContext' },
      },
    },

    cancelled: {
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
  if (state.matches('waitingForPayment')) {
    if (state.matches({ waitingForPayment: 'checking' })) return 'Đang kiểm tra thanh toán...'
    return 'Đang chờ khách quét mã thanh toán'
  }
  if (state.matches('savingOrder')) return 'Đang lưu giao dịch...'
  if (state.matches('printingReceipt')) return 'Đang in hóa đơn...'
  if (state.matches('success')) return 'Thanh toán thành công!'
  if (state.matches('error')) return error ?? 'Có lỗi xảy ra'
  if (state.matches('cancelled')) return 'Giao dịch đã hủy'
  return 'Đang chuẩn bị...'
}
