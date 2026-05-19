import { OrderLocalAPI } from '@/shared/features/order/api/local/order.local.api'
import type { AppliedVoucher, CartItem } from '@/shared/features/pos'
import { PaymentMethod } from '@/shared/lib/database'
import { OrderModel, OrderStatus } from '@/shared/lib/database/models'
import { SyncService } from '@/shared/lib/database/sync/sync.service'
import { PrinterService } from '@/shared/services'
import { SnapshotFrom, assign, fromPromise, setup } from 'xstate'
import { PaymentResult, PortablePaymentCommandResult } from '../types'
import { calculateVoucherDiscount } from '../utils'
import { PortablePaymentService } from '../utils/portable-payment.service'

export interface PortablePaymentContext {
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
  error: string | null
  retryCount: number
  savedOrder: OrderModel | null
  paymentResult: PaymentResult | null
  referenceCode?: string
  rawCommandResult?: PortablePaymentCommandResult | null
}

export type PortablePaymentEvent =
  | { type: 'CONFIRM' }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'FORCE_COMPLETE' }
  | { type: 'RETRY_UPDATE' }
  | { type: 'START'; input?: PortablePaymentInput }

export type PortablePaymentInput = {
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
const PORTABLE_CMD_TIMEOUT_MS = 5 * 60 * 1000 // 60s timeout cho giao dịch quẹt thẻ

/**
 * Kiểm tra xem lỗi có phải do mất kết nối socket hay timeout giữa chừng không
 */
function isCommunicationLossError(error: any): boolean {
  const msg = String(error?.message || '').toUpperCase()
  return (
    msg.includes('TIMEOUT') ||
    msg.includes('SOCKET') ||
    msg.includes('DISCONNECT') ||
    msg.includes('CONNECTION_LOST') ||
    msg.includes('NETWORK_ERROR') ||
    msg.includes('LOST') ||
    msg.includes('SIGNAL')
  )
}

/**
 * Kiểm tra kết quả giao dịch thanh toán thành công hay không
 */
function checkSuccessPayment(parsed: PortablePaymentCommandResult | null | undefined): boolean {
  if (!parsed) return false
  const status = parsed.status
  const returnCode = parsed.transInfo?.returnCode
  const statusCode = parsed.statusCode
  const statusText = parsed.statusText
  return (
    status === 'DONE' &&
    returnCode === '00' &&
    (statusCode === 0 || statusCode === '0') &&
    statusText === 'DONE'
  )
}

export const portablePaymentMachine = setup({
  types: {
    context: {} as PortablePaymentContext,
    events: {} as PortablePaymentEvent,
    input: {} as PortablePaymentInput,
  },
  actors: {
    /**
     * Khởi tạo đơn hàng tạm thời (PENDING) trong DB SQLite
     */
    createPendingOrder: fromPromise(async ({ input }: { input: PortablePaymentContext }) => {
      const order = await OrderLocalAPI.createOrderByPos({
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
          method: PaymentMethod.CARD,
          amount: input.total,
        },
      })
      if (!order || !order.id) {
        throw new Error('Mã đơn hàng bị trống hoặc lỗi cơ sở dữ liệu!')
      }
      return order.id
    }),

    /**
     * Thiết lập kết nối IP/Socket tới máy POS qua Native Module
     */
    connectPOS: fromPromise(async () => {
      const resStr = await PortablePaymentService.connect()
      const parsed = JSON.parse(resStr)
      console.log(' connect pos result ', parsed)
      const statusCode = parsed?.statusCode ?? ''
      const statusText = parsed?.statusText || ''
      if (statusCode !== 0) {
        console.log('Connect pos failed')
        throw new Error(statusText || 'Xảy ra lỗi khi kết nối tới máy pos thanh toán')
      }
      return resStr
    }),

    /**
     * Bắn lệnh thanh toán (SALE) cho máy POS di động
     */
    sendCommand: fromPromise(
      async ({
        input,
      }: {
        input: { amount: number; orderId: string }
      }): Promise<PortablePaymentCommandResult> => {
        const cmd = JSON.stringify({
          command: 'sale',
          params: {
            amount: input.amount,
            currency: '704',
            merTransId: input.orderId,
          },
        })
        const resStr = await PortablePaymentService.executeCommand(cmd)
        const parsed = JSON.parse(resStr) as PortablePaymentCommandResult
        console.log(' send command result ', parsed)
        if (!checkSuccessPayment(parsed)) {
          throw new Error(parsed?.message || 'Giao dịch thanh toán thất bại')
        }
        return parsed
      },
    ),

    /**
     * Gọi lệnh đối soát (last_trans) trực tiếp từ thiết bị POS khi bị mất tín hiệu giữa chừng
     */
    verifyLastTransaction: fromPromise(
      async ({ input }: { input: { orderId: string } }): Promise<PortablePaymentCommandResult> => {
        const cmd = JSON.stringify({
          command: 'last_trans',
          params: {},
        })
        const resStr = await PortablePaymentService.executeCommand(cmd)
        const parsed = JSON.parse(resStr) as PortablePaymentCommandResult

        // Trong trường hợp thanh toán thành công nhưng máy Pos thanh toán bị lỗi gì đó nên sẽ check giao dịch gần nhất
        // merTransId chính là OrderId truyền vào từ ban đầu
        const isSuccessPayment = checkSuccessPayment(parsed) && parsed?.merTransId === input.orderId

        if (!isSuccessPayment) {
          throw new Error('Đối soát: Giao dịch cuối cùng không khớp hoặc thất bại!')
        }
        return parsed
      },
    ),

    /**
     * Xử lý hủy đơn hàng tạm thời trên DB (Đổi trạng thái thành FAILED)
     */
    cancelOrder: fromPromise(async ({ input }: { input: { orderId: string | null } }) => {
      if (!input.orderId) return
      await OrderLocalAPI.updateOrderStatus(input.orderId, OrderStatus.FAILED)
    }),

    completeOrder: fromPromise(
      async ({ input }: { input: PortablePaymentContext }): Promise<OrderModel> => {
        if (!input.orderId) throw new Error('Không tìm thấy ID đơn hàng!')

        const paymentPayload = {
          method: PaymentMethod.CARD,
          amount: input.total,
          referenceCode: input.referenceCode ?? input.orderId,
          portablePaymentResult: input.rawCommandResult ?? undefined,
        }

        // Sử dụng API hoàn tất đơn hàng dành riêng cho Portable POS
        return await OrderLocalAPI.completeOrderByPos(input.orderId, paymentPayload)
      },
    ),

    /**
     * In hóa đơn bán hàng
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
    isCommunicationLoss: ({ event }) => isCommunicationLossError((event as any).error),
  },
  actions: {
    assignOrderId: assign({
      orderId: ({ event }) => (event as any).output,
    }),
    assignPaymentResponse: assign({
      referenceCode: ({ event }) =>
        (event as any).output?.transInfo?.transId ??
        (event as any).output?.transId ??
        (event as any).output?.transInfo?.refNo ??
        null,
      rawCommandResult: ({ event }) => (event as any).output ?? null,
    }),
    recordError: assign({
      error: ({ event }) =>
        (event as any).error?.message ?? 'Đã xảy ra lỗi hệ thống trong quá trình quẹt thẻ!',
      retryCount: ({ context }) => context.retryCount + 1,
    }),
    clearError: assign({ error: null }),
    resetContext: assign(({ event }) => {
      const baseContext = {
        orderId: null,
        error: null,
        retryCount: 0,
        savedOrder: null,
        paymentResult: null,
        referenceCode: undefined,
        rawCommandResult: null,
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
        method: PaymentMethod.CARD,
        paidAmount: context.total,
        change: 0,
        isOnline: true,
        orderId: context.orderId ?? context.savedOrder?.id ?? undefined,
        referenceCode: context.referenceCode ?? context.orderId ?? undefined,
      }),
    }),
    assignManualPaymentResult: assign({
      paymentResult: ({ context }) => ({
        success: true,
        method: PaymentMethod.CARD,
        paidAmount: context.total,
        change: 0,
        isOnline: false,
        orderId: context.orderId ?? undefined,
        referenceCode: context.orderId ?? undefined,
      }),
    }),
    triggerSync: () => {
      SyncService.performSync().catch((err) =>
        console.error('Đồng bộ dữ liệu sau quẹt thẻ thất bại:', err),
      )
    },
  },
  delays: {
    PORTABLE_CMD_TIMEOUT: PORTABLE_CMD_TIMEOUT_MS,
  },
}).createMachine({
  id: 'portablePayment',
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
    error: null,
    retryCount: 0,
    savedOrder: null,
    paymentResult: null,
    referenceCode: undefined,
    rawCommandResult: null,
  }),
  states: {
    idle: {
      on: {
        CONFIRM: { target: 'creatingPendingOrder' },
        START: { target: 'idle', actions: 'resetContext' },
      },
    },

    creatingPendingOrder: {
      invoke: {
        id: 'createPendingOrder',
        src: 'createPendingOrder',
        input: ({ context }) => context,
        onDone: {
          target: 'connecting',
          actions: 'assignOrderId',
        },
        onError: {
          target: 'idle',
          actions: 'recordError',
        },
      },
    },

    connecting: {
      invoke: {
        id: 'connectPOS',
        src: 'connectPOS',
        onDone: {
          target: 'sendingCommand',
        },
        onError: {
          target: 'connectionFailed',
          actions: 'recordError',
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
        CANCEL: { target: 'cancelingOrder' },
      },
    },

    sendingCommand: {
      invoke: {
        id: 'sendCommand',
        src: 'sendCommand',
        input: ({ context }) => ({
          amount: context.total,
          orderId: context.orderId!,
        }),
        onDone: {
          target: 'updatingOrder',
          actions: 'assignPaymentResponse',
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
          actions: 'recordError',
        },
      },
    },

    verifyingUnknown: {
      invoke: {
        id: 'verifyLastTransaction',
        src: 'verifyLastTransaction',
        input: ({ context }) => ({
          orderId: context.orderId!,
        }),
        onDone: {
          target: 'updatingOrder',
          actions: 'assignPaymentResponse',
        },
        onError: {
          target: 'paymentFailed',
          actions: 'recordError',
        },
      },
    },

    paymentFailed: {
      on: {
        RETRY: {
          target: 'sendingCommand',
          guard: 'canRetry',
          actions: 'clearError',
        },
        CANCEL: { target: 'cancelingOrder' },
      },
    },

    cancelingOrder: {
      invoke: {
        id: 'cancelOrder',
        src: 'cancelOrder',
        input: ({ context }) => ({
          orderId: context.orderId,
        }),
        onDone: {
          target: 'idle',
          actions: 'resetContext',
        },
        onError: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },

    updatingOrder: {
      invoke: {
        id: 'completeOrder',
        src: 'completeOrder',
        input: ({ context }) => context,
        onDone: {
          target: 'preparingReceipt',
          actions: ['assignSavedOrder', 'assignPaymentResult', 'triggerSync'],
        },
        onError: {
          target: 'manualResolution',
          actions: 'recordError',
        },
      },
    },

    manualResolution: {
      on: {
        FORCE_COMPLETE: {
          target: 'preparingReceipt',
          actions: 'assignManualPaymentResult',
        },
        RETRY_UPDATE: {
          target: 'updatingOrder',
          actions: 'clearError',
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
          target: 'success', // Lỗi in hóa đơn không cản trở flow thành công
        },
      },
    },

    success: {
      on: {
        START: { target: 'idle', actions: 'resetContext' },
      },
    },
  },
})

/**
 * Lấy nhãn trạng thái hiển thị tiếng Việt trực quan cho luồng quẹt thẻ POS
 */
export function getPortablePaymentStatusLabel(
  state: SnapshotFrom<typeof portablePaymentMachine>,
): string {
  const { error } = state.context
  if (state.matches('idle')) return 'Sẵn sàng giao dịch quẹt thẻ'
  if (state.matches('creatingPendingOrder')) return 'Đang khởi tạo hóa đơn tạm thời...'
  if (state.matches('connecting')) return 'Đang thiết lập kết nối Socket đến máy POS...'
  if (state.matches('connectionFailed')) return error ?? 'Lỗi kết nối Socket tới thiết bị POS!'
  if (state.matches('sendingCommand')) return 'Đang xử lý thanh toán quẹt/chạm thẻ trên máy POS...'
  if (state.matches('verifyingUnknown'))
    return 'Mất tín hiệu giữa chừng! Đang tự động đối soát giao dịch...'
  if (state.matches('paymentFailed')) return error ?? 'Giao dịch quẹt thẻ bị lỗi!'
  if (state.matches('cancelingOrder')) return 'Đang hủy giao dịch và giải phóng tài nguyên...'
  if (state.matches('updatingOrder')) return 'Đang cập nhật cơ sở dữ liệu hoàn tất đơn...'
  if (state.matches('manualResolution'))
    return 'Lỗi SQLite ghi DB! Cần xác nhận thủ công hoặc thử lại.'
  if (state.matches('preparingReceipt') || state.matches('printingReceipt'))
    return 'Giao dịch thành công! Đang in hóa đơn...'
  if (state.matches('success')) return 'Thanh toán thành công!'
  return 'Đang chuẩn bị...'
}
