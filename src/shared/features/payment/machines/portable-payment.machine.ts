import {
  OrderRemoteAPI,
  PosCartLine,
  PosCheckoutRequest,
  PosCheckoutResult,
} from '@/shared/features/order/api/remote/order.remote.api'
import { PaymentRemoteAPI } from '@/shared/features/payment/api/remote/payment.remote.api'
import type { AppliedVoucher, CartItem } from '@/shared/features/pos'
import { PaymentMethod } from '@/shared/lib/database'
import { PrinterService } from '@/shared/services'
import { SnapshotFrom, assign, fromPromise, setup } from 'xstate'
import { PaymentResult, PortablePaymentCommandResult } from '../types'
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

  /** Processing Data — EDC Flow */
  checkoutResult: PosCheckoutResult | null // Response từ POST /v1/pos/checkout
  paymentId: string | null // payments[0].paymentId từ checkout
  paymentVersion: number // Version để dùng OCC cho transitions
  rawCommandResult: PortablePaymentCommandResult | null // Kết quả từ máy EDC
  manualCardDetails: {
    terminalId?: string
    merchantId?: string
    referenceNumber?: string
    approvalCode?: string
  } | null
  error: string | null
  retryCount: number
  paymentResult: PaymentResult | null
}

export type PortablePaymentEvent =
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
const PORTABLE_CMD_TIMEOUT_MS = 5 * 60 * 1000

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
  return (
    parsed.status === 'DONE' &&
    parsed.transInfo?.returnCode === '00' &&
    (parsed.statusCode === 0 || parsed.statusCode === '0') &&
    parsed.statusText === 'DONE'
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
     * Bước 1: Tạo đơn hàng + payment INITIATED qua POST /v1/pos/checkout
     * Trả về { checkoutResult, paymentId, paymentVersion }
     */
    createOrder: fromPromise(
      async ({
        input,
      }: {
        input: PortablePaymentContext
      }): Promise<{
        checkoutResult: PosCheckoutResult
        paymentId: string
        paymentVersion: number
      }> => {
        const lines: PosCartLine[] = input.items.map((item) => ({
          variantId: item.product.id,
          unitId: item.product.unitId,
          qty: item.quantity,
          unitPrice: item.product.price,
          discountAmount: item.discountAmount || 0,
          taxRate: 0,
        }))

        const payload: PosCheckoutRequest = {
          cashSessionId: input.sessionId,
          customerId: null,
          currency: 'VND',
          notes: null,
          lines,
          payments: [
            {
              method: 'card_bidv',
              amount: input.total,
              provider: 'card-bidv',
              cardTerminalId: null, // TODO: truyền UUID của terminal từ config thiết bị
            },
          ],
          voucherCode: input.appliedVoucher?.code ?? null,
          issueInvoice: false,
          customerName: null,
          customerTaxId: null,
          customerAddress: null,
        }

        console.log('[PortablePayment] Checkout payload:', JSON.stringify(payload, null, 2))
        let checkoutResult: PosCheckoutResult
        try {
          const res = await OrderRemoteAPI.checkout(payload)
          checkoutResult = res
          console.log('[PortablePayment] Checkout result:', JSON.stringify(checkoutResult, null, 2))
        } catch (err: any) {
          const status = err?.response?.status
          const data = err?.response?.data
          console.error('[PortablePayment] Checkout FAILED:', status, JSON.stringify(data, null, 2))
          throw err
        }

        const cardPayment = checkoutResult.payments?.find((p) => p.method.includes('card'))
        if (!cardPayment?.paymentId) {
          throw new Error('Server không trả về paymentId cho giao dịch thẻ!')
        }

        return {
          checkoutResult,
          paymentId: cardPayment.paymentId,
          paymentVersion: 1, // Payment INITIATED luôn có version = 1
        }
      },
    ),

    /**
     * Bước 2: Chuyển Payment sang PROCESSING
     * POST /v1/payments/{id}/transitions { action: "process", expectedVersion }
     */
    processPayment: fromPromise(
      async ({
        input,
      }: {
        input: { paymentId: string; paymentVersion: number }
      }): Promise<number> => {
        const res = await PaymentRemoteAPI.transitionPayment(input.paymentId, {
          action: 'process',
          expectedVersion: input.paymentVersion,
        })
        console.log('[PortablePayment] Payment → PROCESSING, version:', res.version)
        return res.version
      },
    ),

    /**
     * Bước 3a: Kết nối Socket tới máy POS EDC
     */
    connectPOS: fromPromise(async () => {
      const resStr = await PortablePaymentService.connect()
      const parsed = JSON.parse(resStr)
      console.log('[PortablePayment] Connect result:', parsed)
      if (parsed?.statusCode !== 0) {
        throw new Error(parsed?.statusText || 'Xảy ra lỗi khi kết nối tới máy POS thanh toán')
      }
      return resStr
    }),

    /**
     * Bước 3b: Gửi lệnh SALE → yêu cầu khách quẹt/chạm thẻ trên EDC
     * EDC xử lý → trả về authCode, RRN, maskedPan
     */
    sendCommand: fromPromise(
      async ({
        input,
      }: {
        input: { amount: number; paymentId: string }
      }): Promise<PortablePaymentCommandResult> => {
        const cmd = JSON.stringify({
          command: 'sale',
          params: {
            amount: input.amount,
            currency: '704',
            merTransId: input.paymentId, // Dùng paymentId làm merTransId để đối soát
          },
        })
        const resStr = await PortablePaymentService.executeCommand(cmd)
        const parsed = JSON.parse(resStr) as PortablePaymentCommandResult
        console.log('[PortablePayment] EDC command result:', parsed)
        if (!checkSuccessPayment(parsed)) {
          throw new Error(parsed?.message || 'Giao dịch thanh toán thất bại')
        }
        return parsed
      },
    ),

    /**
     * Bước 3c (fallback): Đối soát giao dịch cuối nếu bị mất tín hiệu
     * POST last_trans → kiểm tra merTransId khớp paymentId
     */
    verifyLastTransaction: fromPromise(
      async ({
        input,
      }: {
        input: { paymentId: string }
      }): Promise<PortablePaymentCommandResult> => {
        const cmd = JSON.stringify({ command: 'last_trans', params: {} })
        const resStr = await PortablePaymentService.executeCommand(cmd)
        const parsed = JSON.parse(resStr) as PortablePaymentCommandResult
        console.log('[PortablePayment] last_trans result:', parsed)

        const isSuccess = checkSuccessPayment(parsed) && parsed?.merTransId === input.paymentId
        if (!isSuccess) {
          throw new Error('Đối soát: Giao dịch cuối không khớp hoặc thất bại!')
        }
        return parsed
      },
    ),

    /**
     * Bước 4: Ghi nhận thông tin thẻ từ EDC lên server
     * POST /v1/payments/{id}/card-capture { terminalId, merchantId, maskedPan, authCode, rrn }
     */
    cardCapture: fromPromise(
      async ({
        input,
      }: {
        input: { paymentId: string; edcResult: PortablePaymentCommandResult }
      }): Promise<void> => {
        const transInfo = input.edcResult.transInfo
        await PaymentRemoteAPI.cardCapture(input.paymentId, {
          terminalId: transInfo?.tid || 'unknown',
          merchantId: transInfo?.mid || 'unknown',
          maskedPan: transInfo?.cardNo || 'unknown',
          authCode: transInfo?.approvalCode || 'unknown',
          rrn: transInfo?.refNo || 'unknown',
        })
        console.log('[PortablePayment] Card capture OK')
      },
    ),

    /**
     * Ghi nhận thông tin thẻ nhập tay từ máy POS di động khi thiết bị EDC mất kết nối/cấu hình lỗi
     */
    cardCaptureManual: fromPromise(
      async ({
        input,
      }: {
        input: {
          paymentId: string
          manualDetails: {
            terminalId?: string
            merchantId?: string
            referenceNumber?: string
            approvalCode?: string
          }
        }
      }): Promise<void> => {
        await PaymentRemoteAPI.cardCapture(input.paymentId, {
          terminalId: input.manualDetails?.terminalId || 'unknown',
          merchantId: input.manualDetails?.merchantId || 'unknown',
          maskedPan: 'unknown',
          authCode: input.manualDetails?.approvalCode || 'unknown',
          rrn: input.manualDetails?.referenceNumber || 'unknown',
        })
        console.log('[PortablePayment] Manual card capture OK')
      },
    ),

    /**
     * Bước 5: Chuyển Payment sang AUTHORIZED
     * POST /v1/payments/{id}/transitions { action: "authorize", expectedVersion }
     */
    authorizePayment: fromPromise(
      async ({
        input,
      }: {
        input: { paymentId: string; paymentVersion: number }
      }): Promise<number> => {
        const res = await PaymentRemoteAPI.transitionPayment(input.paymentId, {
          action: 'authorize',
          expectedVersion: input.paymentVersion,
        })
        console.log('[PortablePayment] Payment → AUTHORIZED, version:', res.version)
        return res.version
      },
    ),

    /**
     * Bước 6: Capture — hoàn tất giao dịch
     * POST /v1/payments/{id}/transitions { action: "capture", expectedVersion }
     */
    capturePayment: fromPromise(
      async ({
        input,
      }: {
        input: { paymentId: string; paymentVersion: number }
      }): Promise<number> => {
        const res = await PaymentRemoteAPI.transitionPayment(input.paymentId, {
          action: 'capture',
          expectedVersion: input.paymentVersion,
        })
        console.log('[PortablePayment] Payment → CAPTURED, version:', res.version)
        return res.version
      },
    ),

    /**
     * Hủy giao dịch nếu người dùng cancel (void payment)
     */
    cancelPayment: fromPromise(
      async ({
        input,
      }: {
        input: { paymentId: string | null; paymentVersion: number }
      }): Promise<void> => {
        if (!input.paymentId) return
        try {
          await PaymentRemoteAPI.transitionPayment(input.paymentId, {
            action: 'void',
            expectedVersion: input.paymentVersion,
            reason: 'Người dùng hủy giao dịch',
          })
        } catch (err) {
          console.warn('[PortablePayment] Void payment error (non-critical):', err)
        }
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
    assignCheckoutResult: assign({
      checkoutResult: ({ event }) => (event as any).output.checkoutResult,
      paymentId: ({ event }) => (event as any).output.paymentId,
      paymentVersion: ({ event }) => (event as any).output.paymentVersion,
    }),
    assignPaymentVersion: assign({
      paymentVersion: ({ event }) => (event as any).output,
    }),
    assignEdcResult: assign({
      rawCommandResult: ({ event }) => (event as any).output ?? null,
    }),
    recordError: assign({
      error: ({ event }) =>
        (event as any).error?.message ?? 'Đã xảy ra lỗi hệ thống trong quá trình quẹt thẻ!',
      retryCount: ({ context }) => context.retryCount + 1,
    }),
    clearError: assign({ error: null }),
    assignPaymentResult: assign({
      paymentResult: ({ context }) => ({
        success: true,
        method: PaymentMethod.CARD,
        paidAmount: context.total,
        change: 0,
        isOnline: context.manualCardDetails ? false : true,
        orderId: context.checkoutResult?.orderId,
        referenceCode:
          context.rawCommandResult?.transInfo?.refNo ??
          context.rawCommandResult?.transInfo?.transId ??
          context.manualCardDetails?.referenceNumber ??
          context.paymentId ??
          undefined,
      }),
    }),
    assignManualPaymentResult: assign({
      paymentResult: ({ context }) => ({
        success: true,
        method: PaymentMethod.CARD,
        paidAmount: context.total,
        change: 0,
        isOnline: false,
        orderId: context.checkoutResult?.orderId,
        referenceCode: context.paymentId ?? undefined,
      }),
    }),
    assignManualCardDetails: assign({
      manualCardDetails: ({ event }) => ({
        terminalId: (event as any).terminalId,
        merchantId: (event as any).merchantId,
        referenceNumber: (event as any).referenceNumber,
        approvalCode: (event as any).approvalCode,
      }),
    }),
    resetContext: assign(({ event }) => {
      const base = {
        checkoutResult: null,
        paymentId: null,
        paymentVersion: 0,
        rawCommandResult: null,
        manualCardDetails: null,
        error: null,
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
        }
      }
      return base
    }),
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
    checkoutResult: null,
    paymentId: null,
    paymentVersion: 0,
    rawCommandResult: null,
    manualCardDetails: null,
    error: null,
    retryCount: 0,
    paymentResult: null,
  }),
  states: {
    idle: {
      on: {
        CONFIRM: { target: 'creatingOrder' },
        START: { target: 'idle', actions: 'resetContext' },
      },
    },

    /**
     * Bước 1: POST /v1/pos/checkout → orderId + paymentId (INITIATED)
     */
    creatingOrder: {
      invoke: {
        id: 'createOrder',
        src: 'createOrder',
        input: ({ context }) => context,
        onDone: {
          target: 'processingPayment',
          actions: 'assignCheckoutResult',
        },
        onError: {
          target: 'idle',
          actions: 'recordError',
        },
      },
    },

    /**
     * Bước 2: POST /v1/payments/{id}/transitions { action: "process" }
     * Payment: INITIATED → PROCESSING
     */
    processingPayment: {
      invoke: {
        id: 'processPayment',
        src: 'processPayment',
        input: ({ context }) => ({
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

    /**
     * Bước 3a: Kết nối Socket tới máy POS EDC
     */
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

    /**
     * Bước 3b: Gửi lệnh SALE → chờ khách quẹt/chạm thẻ trên EDC
     */
    sendingCommand: {
      invoke: {
        id: 'sendCommand',
        src: 'sendCommand',
        input: ({ context }) => ({
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

    /**
     * Bước 3c (fallback): Mất tín hiệu → last_trans để đối soát
     */
    verifyingUnknown: {
      invoke: {
        id: 'verifyLastTransaction',
        src: 'verifyLastTransaction',
        input: ({ context }) => ({
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

    paymentFailed: {
      on: {
        RETRY: {
          target: 'sendingCommand',
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

    /**
     * Bước 4: POST /v1/payments/{id}/card-capture
     */
    capturingCard: {
      invoke: {
        id: 'cardCapture',
        src: 'cardCapture',
        input: ({ context }) => ({
          paymentId: context.paymentId!,
          edcResult: context.rawCommandResult!,
        }),
        onDone: { target: 'authorizingPayment' },
        onError: {
          // card-capture fail → vẫn thử authorize (thông tin thẻ đã nhận)
          target: 'authorizingPayment',
        },
      },
    },

    /**
     * Ghi nhận thông tin thẻ nhập tay của thu ngân
     */
    capturingCardManual: {
      invoke: {
        id: 'cardCaptureManual',
        src: 'cardCaptureManual',
        input: ({ context }) => ({
          paymentId: context.paymentId!,
          manualDetails: context.manualCardDetails!,
        }),
        onDone: { target: 'authorizingPayment' },
        onError: {
          // Thử authorize dù nhập tay fail
          target: 'authorizingPayment',
        },
      },
    },

    /**
     * Bước 5: POST /v1/payments/{id}/transitions { action: "authorize" }
     * Payment: PROCESSING → AUTHORIZED
     */
    authorizingPayment: {
      invoke: {
        id: 'authorizePayment',
        src: 'authorizePayment',
        input: ({ context }) => ({
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

    /**
     * Bước 6: POST /v1/payments/{id}/transitions { action: "capture" }
     * Payment: AUTHORIZED → CAPTURED
     */
    capturingPayment: {
      invoke: {
        id: 'capturePayment',
        src: 'capturePayment',
        input: ({ context }) => ({
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

    /**
     * Xử lý thủ công nếu authorize/capture thất bại phía server
     */
    manualResolution: {
      on: {
        FORCE_COMPLETE: {
          target: 'preparingReceipt',
          actions: 'assignManualPaymentResult',
        },
        RETRY: {
          target: 'authorizingPayment',
          actions: 'clearError',
        },
      },
    },

    /**
     * Hủy: void payment trên server
     */
    cancelingPayment: {
      invoke: {
        id: 'cancelPayment',
        src: 'cancelPayment',
        input: ({ context }) => ({
          paymentId: context.paymentId,
          paymentVersion: context.paymentVersion,
        }),
        onDone: { target: 'idle', actions: 'resetContext' },
        onError: { target: 'idle', actions: 'resetContext' },
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
        onError: { target: 'success' }, // Lỗi in không cản trở flow
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
 * Lấy nhãn trạng thái hiển thị tiếng Việt cho luồng quẹt thẻ EDC
 */
export function getPortablePaymentStatusLabel(
  state: SnapshotFrom<typeof portablePaymentMachine>,
): string {
  const { error } = state.context
  if (state.matches('idle')) return 'Sẵn sàng giao dịch quẹt thẻ'
  if (state.matches('creatingOrder')) return 'Đang tạo đơn hàng trên hệ thống...'
  if (state.matches('processingPayment')) return 'Đang khởi tạo giao dịch thẻ...'
  if (state.matches('connecting')) return 'Đang thiết lập kết nối tới máy POS EDC...'
  if (state.matches('connectionFailed')) return error ?? 'Lỗi kết nối tới thiết bị EDC!'
  if (state.matches('sendingCommand')) return 'Đang chờ quẹt/chạm thẻ trên máy EDC...'
  if (state.matches('verifyingUnknown'))
    return 'Mất tín hiệu! Đang tự động đối soát giao dịch cuối...'
  if (state.matches('capturingCard') || state.matches('capturingCardManual'))
    return 'Đang ghi nhận thông tin thẻ lên hệ thống...'
  if (state.matches('authorizingPayment')) return 'Đang xác thực giao dịch...'
  if (state.matches('capturingPayment')) return 'Đang hoàn tất thanh toán...'
  if (state.matches('paymentFailed')) return error ?? 'Giao dịch quẹt thẻ bị lỗi!'
  if (state.matches('cancelingPayment')) return 'Đang hủy giao dịch...'
  if (state.matches('manualResolution')) return 'Lỗi server! Cần xác nhận thủ công hoặc thử lại.'
  if (state.matches('preparingReceipt') || state.matches('printingReceipt'))
    return 'Đang in hóa đơn...'
  if (state.matches('success')) return 'Thanh toán thành công!'
  return 'Đang chuẩn bị...'
}
