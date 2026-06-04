import { TenantConfig } from '@/shared/features/app/types/app.types'
import { PosCheckoutResult } from '@/shared/features/order/api/remote/order.remote.api'
import { AppliedVoucher, CartItem } from '@/shared/features/pos'
import { PaymentMethod } from '@/shared/lib/database'
import { toast } from '@/shared/store/use-alert-store'
import React from 'react'
import { assign, setup } from 'xstate'
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
import { cancelOrderActor, createMixCheckoutActor } from '../flows/checkout.actors'
import { printReceiptActor } from '../flows/print.actors'
import { checkQrPaymentStatusActor, fetchQrActor } from '../flows/qr-collection.actors'

// ─── Machine Types ────────────────────────────────────────────────────────────

export interface MixPaymentContext {
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

  /** User Form Input */
  cashAmount: number
  nonCashAmount: number
  selectedMethod: 'qr' | 'card' | null

  /** Processing Data */
  checkoutResult: PosCheckoutResult | null
  orderId: string | null
  orderCode: string | null
  nonCashPaymentId: string | null
  nonCashPaymentVersion: number
  rawCommandResult: PortablePaymentCommandResult | null
  qrContent: string | null
  expiresAt: string | null
  manualCardDetails: {
    terminalId?: string
    merchantId?: string
    referenceNumber?: string
    approvalCode?: string
  } | null

  /** Error and Result */
  error: string | null
  errorCode: PaymentErrorCode | null
  retryCount: number
  paymentResult: PaymentResult | null

  /** Manager Override PIN */
  managerAuth: { employeeCode: string; pin: string } | null
  managerAuthError: string | null
}

export type MixPaymentEvent =
  | { type: 'START'; input?: MixPaymentInput }
  | { type: 'SET_CASH_AMOUNT'; amount: number }
  | { type: 'SELECT_METHOD'; method: 'qr' | 'card' }
  | { type: 'CONFIRM' }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'CHECK_STATUS_NOW' }
  | { type: 'FORCE_COMPLETE' }
  | {
      type: 'MANUAL_CAPTURE'
      terminalId?: string
      merchantId?: string
      referenceNumber?: string
      approvalCode?: string
    }
  | {
      type: 'SUBMIT_MANAGER_PIN'
      managerAuth: { employeeCode: string; pin: string }
    }

export type MixPaymentInput = {
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
const POLL_INTERVAL_MS = 3000
const TOTAL_TIMEOUT_MS = 5 * 60 * 1000

export const mixPaymentMachine = setup({
  types: {
    context: {} as MixPaymentContext,
    events: {} as MixPaymentEvent,
    input: {} as MixPaymentInput,
  },
  actors: {
    createMixCheckout: createMixCheckoutActor,
    cancelOrder: cancelOrderActor,
    fetchQR: fetchQrActor,
    checkQrStatus: checkQrPaymentStatusActor,
    processPayment: processPaymentActor,
    connectPOS: connectPosActor,
    sendCommand: sendCardSaleCommandActor,
    verifyLastTransaction: verifyLastTransactionActor,
    cardCapture: cardCaptureActor,
    cardCaptureManual: cardCaptureManualActor,
    authorizePayment: authorizePaymentActor,
    capturePayment: capturePaymentActor,
    cancelPayment: cancelPaymentActor,
    printReceipt: printReceiptActor,
  },
  guards: {
    canConfirm: ({ context }) => {
      const total = Math.round(context.total)
      if (!context.selectedMethod) return false
      if (context.cashAmount <= 0) return false
      if (context.cashAmount >= total) return false
      if (context.nonCashAmount <= 0) return false
      if (context.cashAmount + context.nonCashAmount !== total) return false
      if (context.nonCashAmount < 5000) return false

      return true
    },
    isQr: ({ context }) => context.selectedMethod === 'qr',
    isCard: ({ context }) => context.selectedMethod === 'card',
    isCommunicationLoss: ({ event }) => isCommunicationLossError((event as any).error),
    canRetry: ({ context }) => context.retryCount < MAX_RETRIES,
  },
  actions: {
    setCashAmount: assign({
      cashAmount: ({ event }) => {
        if (event.type !== 'SET_CASH_AMOUNT') return 0
        return event.amount
      },
      nonCashAmount: ({ context, event }) => {
        if (event.type !== 'SET_CASH_AMOUNT') return context.nonCashAmount
        const total = Math.round(context.total)
        const remaining = total - event.amount
        return remaining > 0 ? remaining : 0
      },
    }),
    selectMethod: assign({
      selectedMethod: ({ event }) => {
        if (event.type !== 'SELECT_METHOD') return null
        return event.method
      },
    }),
    assignCheckoutResult: assign(({ event }) => {
      const output = (event as any).output
      return {
        checkoutResult: output.checkoutResult,
        orderId: output.orderId,
        orderCode: output.orderCode,
        nonCashPaymentId: output.nonCashPaymentId,
        nonCashPaymentVersion: output.nonCashPaymentVersion,
      }
    }),
    assignPaymentVersion: assign({
      nonCashPaymentVersion: ({ event }) => (event as any).output,
    }),
    assignEdcResult: assign({
      rawCommandResult: ({ event }) => (event as any).output ?? null,
    }),
    assignQrData: assign({
      qrContent: ({ event }) =>
        (event as any).output?.qrPayload ?? (event as any).output?.qrUrl ?? null,
      expiresAt: ({ event }) => (event as any).output?.expiresAt ?? null,
      rawCommandResult: ({ event }) => (event as any).output ?? null,
    }),
    assignPaymentResult: assign({
      paymentResult: ({ context }) => ({
        success: true,
        method: PaymentMethod.MIX,
        paidAmount: context.total,
        change: 0,
        isOnline: context.manualCardDetails ? false : true,
        orderId: context.orderCode ?? context.orderId ?? undefined,
        referenceCode:
          context.rawCommandResult?.transInfo?.refNo ??
          context.rawCommandResult?.transInfo?.transId ??
          context.manualCardDetails?.referenceNumber ??
          context.nonCashPaymentId ??
          undefined,
      }),
    }),
    assignForceCompleteQrPaymentResult: assign({
      paymentResult: ({ context }) => ({
        success: true,
        method: PaymentMethod.MIX,
        paidAmount: context.total,
        change: 0,
        isOnline: false,
        orderId: context.orderCode ?? context.orderId ?? undefined,
        referenceCode: context.nonCashPaymentId ?? undefined,
      }),
    }),
    assignManualCardPaymentResult: assign({
      paymentResult: ({ context }) => ({
        success: true,
        method: PaymentMethod.MIX,
        paidAmount: context.total,
        change: 0,
        isOnline: false,
        orderId: context.orderCode ?? context.orderId ?? undefined,
        referenceCode:
          context.manualCardDetails?.referenceNumber ?? context.nonCashPaymentId ?? undefined,
      }),
    }),
    assignManualCardDetails: assign({
      manualCardDetails: ({ event }) => {
        if (event.type !== 'MANUAL_CAPTURE') return null
        return {
          terminalId: event.terminalId,
          merchantId: event.merchantId,
          referenceNumber: event.referenceNumber,
          approvalCode: event.approvalCode,
        }
      },
    }),
    recordError: assign({
      error: ({ event }) => {
        const err = (event as any).error
        console.error('[MixPaymentMachine Error Action]', err)

        let errMsg = 'Đã xảy ra lỗi hệ thống khi xử lý thanh toán hỗn hợp!'
        if (err && typeof err === 'object') {
          const axiosErr = err as any
          if (axiosErr.response) {
            console.error(
              '[MixPaymentMachine Error Action] Axios Response Status:',
              axiosErr.response.status,
            )
            console.error(
              '[MixPaymentMachine Error Action] Axios Response Data:',
              JSON.stringify(axiosErr.response.data, null, 2),
            )
            errMsg = axiosErr.response.data?.error || axiosErr.response.data?.message || errMsg
          }
        }

        if (
          errMsg === 'Đã xảy ra lỗi hệ thống khi xử lý thanh toán hỗn hợp!' &&
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
        cashAmount: 0,
        nonCashAmount: 0,
        selectedMethod: null,
        checkoutResult: null,
        orderId: null,
        orderCode: null,
        nonCashPaymentId: null,
        nonCashPaymentVersion: 1,
        rawCommandResult: null,
        qrContent: null,
        expiresAt: null,
        manualCardDetails: null,
        error: null,
        errorCode: null,
        retryCount: 0,
        paymentResult: null,
        managerAuth: null,
        managerAuthError: null,
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
          nonCashAmount: Math.round(event.input.total),
        }
      }
      return baseContext as any
    }),
    assignTimeoutError: assign({
      error: () => 'Đã hết thời gian thanh toán. Vui lòng thử lại!',
      errorCode: () => PAYMENT_ERROR_CODES.TIMEOUT,
    }),
    notifyTimeout: () => {
      toast.error('Mã QR hết hạn thanh toán!')
    },
  },
  delays: {
    POLL_INTERVAL: POLL_INTERVAL_MS,
    TOTAL_TIMEOUT: TOTAL_TIMEOUT_MS,
    PORTABLE_CMD_TIMEOUT: 300000,
  },
}).createMachine({
  id: 'mixPayment',
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
    cashAmount: 0,
    nonCashAmount: Math.round(input.total),
    selectedMethod: null,
    checkoutResult: null,
    orderId: null,
    orderCode: null,
    nonCashPaymentId: null,
    nonCashPaymentVersion: 1,
    rawCommandResult: null,
    qrContent: null,
    expiresAt: null,
    manualCardDetails: null,
    error: null,
    errorCode: null,
    retryCount: 0,
    paymentResult: null,
    managerAuth: null,
    managerAuthError: null,
  }),
  states: {
    idle: {
      on: {
        START: {
          actions: 'resetContext',
        },
        SET_CASH_AMOUNT: {
          actions: 'setCashAmount',
        },
        SELECT_METHOD: {
          actions: 'selectMethod',
        },
        CONFIRM: {
          target: 'creatingCheckout',
          guard: 'canConfirm',
          actions: 'clearError',
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    creatingCheckout: {
      invoke: {
        id: 'createMixCheckout',
        src: 'createMixCheckout',
        input: ({ context }) => ({
          total: context.total,
          items: context.items,
          sessionId: context.sessionId,
          appliedVoucher: context.appliedVoucher,
          cashAmount: context.cashAmount,
          nonCashAmount: context.nonCashAmount,
          selectedMethod: context.selectedMethod!,
        }),
        onDone: [
          {
            target: 'fetchingQr',
            guard: 'isQr',
            actions: 'assignCheckoutResult',
          },
          {
            target: 'processingCardPayment',
            guard: 'isCard',
            actions: 'assignCheckoutResult',
          },
        ],
        onError: {
          target: 'error',
          actions: 'recordError',
        },
      },
    },

    // QR subflow
    fetchingQr: {
      on: {
        CANCEL: { target: 'voidingPayment' },
      },
      invoke: {
        id: 'fetchQR',
        src: 'fetchQR',
        input: ({ context }) => ({
          paymentId: context.nonCashPaymentId!,
          amount: context.nonCashAmount,
          orderCode: context.orderCode!,
          tenantConfig: context.tenantConfig ?? null,
        }),
        onDone: {
          target: 'waitingQrPayment',
          actions: 'assignQrData',
        },
        onError: {
          target: 'paymentFailed',
          actions: 'recordError',
        },
      },
    },

    waitingQrPayment: {
      on: {
        CHECK_STATUS_NOW: { target: '.checking' },
        FORCE_COMPLETE: {
          target: '#mixPayment.preparingReceipt',
          actions: 'assignForceCompleteQrPaymentResult',
        },
        CANCEL: { target: 'voidingPayment' },
      },
      initial: 'idle',
      states: {
        idle: {
          after: {
            POLL_INTERVAL: 'checking',
            TOTAL_TIMEOUT: {
              target: '#mixPayment.paymentFailed',
              actions: ['assignTimeoutError', 'notifyTimeout'],
            },
          },
          on: {
            CHECK_STATUS_NOW: 'checking',
          },
        },
        checking: {
          invoke: {
            id: 'checkQrStatus',
            src: 'checkQrStatus',
            input: ({ context }) => ({
              paymentId: context.nonCashPaymentId!,
            }),
            onDone: {
              target: '#mixPayment.preparingReceipt',
              actions: 'assignPaymentResult',
            },
            onError: {
              target: 'idle',
            },
          },
        },
      },
    },

    // Card subflow
    processingCardPayment: {
      invoke: {
        id: 'processPayment',
        src: 'processPayment',
        input: ({ context }) => ({
          paymentId: context.nonCashPaymentId!,
          paymentVersion: context.nonCashPaymentVersion,
        }),
        onDone: {
          target: 'connectingCardTerminal',
          actions: 'assignPaymentVersion',
        },
        onError: {
          target: 'paymentFailed',
          actions: 'recordError',
        },
      },
    },

    connectingCardTerminal: {
      on: {
        MANUAL_CAPTURE: {
          target: 'capturingCardManual',
          actions: 'assignManualCardDetails',
        },
        CANCEL: {
          target: 'voidingPayment',
        },
      },
      invoke: {
        id: 'connectPOS',
        src: 'connectPOS',
        onDone: {
          target: 'sendingCardCommand',
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
          target: 'connectingCardTerminal',
          guard: 'canRetry',
          actions: 'clearError',
        },
        MANUAL_CAPTURE: {
          target: 'capturingCardManual',
          actions: 'assignManualCardDetails',
        },
        CANCEL: {
          target: 'voidingPayment',
        },
      },
    },

    sendingCardCommand: {
      invoke: {
        id: 'sendCommand',
        src: 'sendCommand',
        input: ({ context }) => ({
          amount: context.nonCashAmount,
          paymentId: context.nonCashPaymentId!,
        }),
        onDone: {
          target: 'capturingCardInfo',
          actions: 'assignEdcResult',
        },
        onError: [
          {
            target: 'verifyingUnknownCardTransaction',
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
          target: 'verifyingUnknownCardTransaction',
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

    verifyingUnknownCardTransaction: {
      invoke: {
        id: 'verifyLastTransaction',
        src: 'verifyLastTransaction',
        input: ({ context }) => ({
          paymentId: context.nonCashPaymentId!,
        }),
        onDone: {
          target: 'capturingCardInfo',
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

    capturingCardInfo: {
      invoke: {
        id: 'cardCapture',
        src: 'cardCapture',
        input: ({ context }) => ({
          paymentId: context.nonCashPaymentId!,
          edcResult: context.rawCommandResult!,
        }),
        onDone: {
          target: 'authorizingCardPayment',
        },
        onError: {
          target: 'authorizingCardPayment',
        },
      },
    },

    capturingCardManual: {
      invoke: {
        id: 'cardCaptureManual',
        src: 'cardCaptureManual',
        input: ({ context }) => ({
          paymentId: context.nonCashPaymentId!,
          manualDetails: context.manualCardDetails!,
        }),
        onDone: {
          target: 'authorizingCardPayment',
        },
        onError: {
          target: 'authorizingCardPayment',
        },
      },
    },

    authorizingCardPayment: {
      invoke: {
        id: 'authorizePayment',
        src: 'authorizePayment',
        input: ({ context }) => ({
          paymentId: context.nonCashPaymentId!,
          paymentVersion: context.nonCashPaymentVersion,
        }),
        onDone: {
          target: 'capturingCardPayment',
          actions: 'assignPaymentVersion',
        },
        onError: {
          target: 'manualResolution',
          actions: 'recordError',
        },
      },
    },

    capturingCardPayment: {
      invoke: {
        id: 'capturePayment',
        src: 'capturePayment',
        input: ({ context }) => ({
          paymentId: context.nonCashPaymentId!,
          paymentVersion: context.nonCashPaymentVersion,
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
        FORCE_COMPLETE: {
          target: 'preparingReceipt',
          actions: 'assignManualCardPaymentResult',
        },
        RETRY: {
          target: 'authorizingCardPayment',
          actions: 'clearError',
        },
        CANCEL: {
          target: 'voidingPayment',
        },
      },
    },

    paymentFailed: {
      on: {
        RETRY: [
          {
            target: 'fetchingQr',
            guard: 'isQr',
            actions: 'clearError',
          },
          {
            target: 'sendingCardCommand',
            guard: 'isCard',
            actions: 'clearError',
          },
        ],
        MANUAL_CAPTURE: {
          target: 'capturingCardManual',
          guard: 'isCard',
          actions: 'assignManualCardDetails',
        },
        FORCE_COMPLETE: {
          target: 'preparingReceipt',
          guard: 'isQr',
          actions: 'assignForceCompleteQrPaymentResult',
        },
        CANCEL: {
          target: 'voidingPayment',
        },
      },
    },

    error: {
      on: {
        RETRY: {
          target: 'creatingCheckout',
          actions: 'clearError',
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    preparingReceipt: {
      after: {
        800: {
          target: 'printingReceipt',
        },
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
          target: 'success',
        },
      },
    },

    voidingPayment: {
      invoke: {
        id: 'cancelPayment',
        src: 'cancelPayment',
        input: ({ context }) => ({
          paymentId: context.nonCashPaymentId,
          paymentVersion: context.nonCashPaymentVersion,
        }),
        onDone: {
          target: 'cancelling',
        },
        onError: {
          target: 'cancelling',
        },
      },
    },

    cancelling: {
      invoke: {
        id: 'cancelOrder',
        src: 'cancelOrder',
        input: ({ context }) => ({
          orderId: context.orderId,
          shiftId: context.shiftId,
          staffId: context.staffId,
          managerAuth: context.managerAuth,
        }),
        onDone: {
          target: 'cancelled',
        },
        onError: [
          {
            guard: ({ event }) => {
              const errData = (event.error as any)?.response?.data
              const code = errData?.errorCode || errData?.error
              return code === 'order.manager_approval_required'
            },
            target: 'waitingManagerApproval',
          },
          {
            guard: ({ event }) => {
              const errData = (event.error as any)?.response?.data
              const code = errData?.errorCode || errData?.error
              return (
                code === 'auth.invalid_manager_credentials' ||
                code === 'auth.insufficient_manager_permissions'
              )
            },
            actions: assign({
              managerAuthError: ({ event }) => {
                const errData = (event.error as any)?.response?.data
                return errData?.message || 'Thông tin phê duyệt của Quản lý không hợp lệ.'
              },
            }),
            target: 'waitingManagerApproval',
          },
          {
            target: 'cancelled',
          },
        ],
      },
    },

    waitingManagerApproval: {
      on: {
        SUBMIT_MANAGER_PIN: {
          actions: assign({
            managerAuth: ({ event }) => event.managerAuth,
            managerAuthError: null,
          }),
          target: 'cancelling',
        },
        CANCEL: [
          {
            target: 'idle',
            guard: ({ context }) => !context.checkoutResult,
            actions: assign({
              managerAuth: null,
              managerAuthError: null,
            }),
          },
          {
            target: 'waitingQrPayment',
            guard: ({ context }) => context.selectedMethod === 'qr',
            actions: assign({
              managerAuth: null,
              managerAuthError: null,
            }),
          },
          {
            target: 'connectionFailed',
            guard: ({ context }) => context.selectedMethod === 'card',
            actions: assign({
              managerAuth: null,
              managerAuthError: null,
            }),
          },
          {
            target: 'idle',
            actions: assign({
              managerAuth: null,
              managerAuthError: null,
            }),
          },
        ],
      },
    },

    success: {
      on: {
        START: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },

    cancelled: {
      on: {
        START: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
  },
})
