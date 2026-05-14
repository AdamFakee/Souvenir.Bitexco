import { OrderLocalAPI } from '@/shared/features/order/api/local/order.local.api'
import type { AppliedVoucher, CartItem } from '@/shared/features/pos'
import { OrderModel, OrderStatus } from '@/shared/lib/database/models'
import { PaymentMethod } from '@/shared/lib/database'
import { SyncService } from '@/shared/lib/database/sync/sync.service'
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
const POLL_INTERVAL_MS = 2000 // 2 giây
const TOTAL_TIMEOUT_MS = 10 * 60 * 1000 // 10 phút total for QR scanning

export const qrPaymentMachine = setup({
  types: {
    context: {} as QRPaymentContext,
    events: {} as QRPaymentEvent,
    input: {} as QRPaymentInput,
  },
  actors: {
    /**
     * Tạo đơn hàng Local ở trạng thái PENDING.
     */
    createOrder: fromPromise(async ({ input }: { input: QRPaymentContext }) => {
      const order = await OrderLocalAPI.createOrderByQr({
        items: input.items,
        subtotal: input.total + input.discount,
        total: input.total,
        discount: input.discount,
        voucherCode: input.appliedVoucher?.code,
        voucherDiscount: input.appliedVoucher
          ? calculateVoucherDiscount(input.items, input.appliedVoucher)
          : 0,
        staffId: input.staffId,
        shiftId: input.shiftId,
        payment: {
          method: PaymentMethod.BANK_TRANSFER,
          amount: input.total,
        },
      })
      return order.id
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
     * Hoàn tất đơn hàng local (PENDING -> COMPLETED).
     */
    saveOrder: fromPromise(async ({ input }: { input: QRPaymentContext }): Promise<OrderModel> => {
      if (!input.orderId) throw new Error('Thanh toán thất bại!')

      const paymentPayload = {
        method: PaymentMethod.BANK_TRANSFER,
        amount: input.total,
        cashTendered: 0,
        cashChange: 0,
        referenceCode: input.billNumber ?? input.orderId,
      }

      // Cập nhật trạng thái COMPLETED, trừ kho, cộng shift stats và trigger sync
      const order = await OrderLocalAPI.completeOrderByQr(input.orderId, paymentPayload)
      return order
    }),

    /**
     * Đánh dấu đơn hàng thất bại khi Hủy hoặc Timeout.
     */
    failOrder: fromPromise(async ({ input }: { input: { orderId: string | null } }) => {
      if (!input.orderId) return
      await OrderLocalAPI.updateOrderStatus(input.orderId, OrderStatus.FAILED)
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
    triggerSync: () => {
      SyncService.performSync().catch((err) => console.error('Sync after QR failed:', err))
    },
    notifyTimeout: () => {}, // Sẽ được override từ UI
    notifyCancel: () => {}, // Sẽ được override từ UI
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
      on: {
        CANCEL: { target: 'cancelled', actions: 'notifyCancel' },
      },
    },

    waitingForPayment: {
      on: {
        CANCEL: { target: 'cancelled', actions: 'notifyCancel' },
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
          // TH1: Đã có đơn hàng local => Chỉ thử lại bước lấy mã QR
          {
            target: 'fetchingQR',
            guard: ({ context }) => context.orderId !== null && context.retryCount < MAX_RETRIES,
            actions: 'clearError',
          },
          // TH2: Chưa có đơn hàng => Thử lại từ bước tạo đơn
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
      invoke: {
        id: 'failOrder',
        src: 'failOrder',
        input: ({ context }) => ({
          orderId: context.orderId,
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
