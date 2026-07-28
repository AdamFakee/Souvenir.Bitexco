import { toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { assign, fromPromise, setup } from 'xstate'
import { OrderRemoteAPI, RefundOrderResult } from '../api/remote/order.remote.api'
import { getOrderErrorMessage } from '../constants'
import { IOrder } from '../types'
import { buildRefundPaymentsFromSnapshot, checkCanReturn, RefundPaymentAllocation } from '../utils'

export interface RefundOrderContext {
  order: IOrder | null
  reason: string
  idempotencyKey: string
  refundAmount: number
  previewRefundAmount: number
  shiftId: string
  staffId: string
  refundPayments: RefundPaymentAllocation[]
  result: RefundOrderResult | null
  error: string | null
  managerAuth: { employeeCode: string; pin: string } | null
  managerAuthError: string | null
  managerApprovalMessage: string | null
}

export type RefundOrderEvent =
  | { type: 'START'; order: IOrder; shiftId: string; staffId: string }
  | { type: 'SET_REASON'; reason: string }
  | { type: 'SUBMIT' }
  | { type: 'SUBMIT_MANAGER_PIN'; managerAuth: { employeeCode: string; pin: string } }
  | { type: 'CANCEL' }
  | { type: 'RESET' }

const DEFAULT_CONTEXT: RefundOrderContext = {
  order: null,
  reason: '',
  idempotencyKey: '',
  refundAmount: 0,
  previewRefundAmount: 0,
  shiftId: '',
  staffId: '',
  refundPayments: [],
  result: null,
  error: null,
  managerAuth: null,
  managerAuthError: null,
  managerApprovalMessage: null,
}

const createIdempotencyKey = () => {
  const randomPart = Math.random().toString(36).slice(2)
  return `refund-${Date.now()}-${randomPart}`
}

const getValidationMessage = (context: RefundOrderContext) => {
  if (!context.shiftId) {
    return 'Không tìm thấy ca làm việc hiện tại. Vui lòng kiểm tra lại trạng thái ca.'
  }
  if (!context.staffId) return 'Không tìm thấy nhân viên đang đăng nhập. Vui lòng đăng nhập lại.'
  if (!context.order) return 'Không tìm thấy đơn hàng cần trả.'
  if (!checkCanReturn(context.order)) {
    return 'Đơn hàng không đủ điều kiện trả hàng (trạng thái, voucher/KM, đã trả, hoặc công nợ).'
  }

  const payments = buildRefundPaymentsFromSnapshot(context.order.paymentsSnapshot)
  if (!payments.ok) return payments.error
  if (!context.refundPayments.length) {
    return 'Không xác định được phương thức hoàn tiền.'
  }

  return null
}

export const refundOrderMachine = setup({
  types: {
    context: {} as RefundOrderContext,
    events: {} as RefundOrderEvent,
  },
  actors: {
    refundOrderActor: fromPromise(
      async ({ input }: { input: RefundOrderContext }): Promise<RefundOrderResult> => {
        if (!input.order) throw new Error('Không tìm thấy đơn hàng cần trả.')

        const payload = {
          orderId: input.order.id,
          idempotencyKey: input.idempotencyKey,
          reason: input.reason.trim(),
          shiftId: input.shiftId,
          staffId: input.staffId,
          managerAuth: input.managerAuth,
        }

        try {
          return await OrderRemoteAPI.refundOrder(payload)
        } catch (error: any) {
          throw error
        }
      },
    ),
  },
  guards: {
    canSubmit: ({ context }) => getValidationMessage(context) === null,
  },
  actions: {
    setOrder: assign(({ event }) => {
      if (event.type !== 'START') return {}

      const paymentsResult = buildRefundPaymentsFromSnapshot(event.order.paymentsSnapshot)
      const refundPayments = paymentsResult.ok ? paymentsResult.items : []
      const previewRefundAmount =
        event.order.total ?? refundPayments.reduce((sum, p) => sum + p.amount, 0)

      return {
        ...DEFAULT_CONTEXT,
        order: event.order,
        shiftId: event.shiftId,
        staffId: event.staffId,
        idempotencyKey: createIdempotencyKey(),
        refundPayments,
        previewRefundAmount,
        error: paymentsResult.ok ? null : paymentsResult.error,
      }
    }),
    setReason: assign({
      reason: ({ event }) => (event.type === 'SET_REASON' ? event.reason : ''),
      error: null,
    }),
    recordValidationError: assign({
      error: ({ context }) => getValidationMessage(context),
    }),
    notifyValidationError: ({ context }) => {
      const message = getValidationMessage(context)
      if (message) toast.error(message)
    },
    assignResult: assign({
      result: ({ event }) => (event as any).output,
      refundAmount: ({ event }) => (event as any).output?.refundAmount ?? 0,
      error: null,
    }),
    notifySuccess: ({ context }) => {
      toast.success(
        `Đã xử lý trả hàng cho đơn hàng #${context.order?.code || context.order?.id || ''}`,
      )
    },
    notifyError: ({ event }) => {
      const error = (event as any).error
      const errData = error?.response?.data
      const code = errData?.errorCode || errData?.error
      const status = error?.response?.status
      const message = code
        ? getOrderErrorMessage(code, status)
        : error?.message || 'Có lỗi xảy ra khi xử lý trả hàng.'
      toast.error(message)
    },
    recordError: assign({
      error: ({ event }) => {
        const error = (event as any).error
        const errData = error?.response?.data
        const code = errData?.errorCode || errData?.error
        const status = error?.response?.status
        return code
          ? getOrderErrorMessage(code, status)
          : error?.message || 'Có lỗi xảy ra khi xử lý trả hàng.'
      },
    }),
    resetContext: assign(() => ({ ...DEFAULT_CONTEXT })),
  },
}).createMachine({
  id: 'refundOrder',
  initial: 'idle',
  context: DEFAULT_CONTEXT,
  states: {
    idle: {
      on: {
        START: {
          target: 'draft',
          actions: 'setOrder',
        },
      },
    },
    draft: {
      on: {
        START: {
          target: 'draft',
          actions: 'setOrder',
        },
        SET_REASON: {
          actions: 'setReason',
        },
        SUBMIT: {
          target: 'validating',
        },
        CANCEL: {
          target: 'idle',
          actions: 'resetContext',
        },
        RESET: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
    validating: {
      always: [
        {
          target: 'submittingReturn',
          guard: 'canSubmit',
        },
        {
          target: 'draft',
          actions: ['recordValidationError', 'notifyValidationError'],
        },
      ],
    },
    submittingReturn: {
      invoke: {
        src: 'refundOrderActor',
        input: ({ context }) => context,
        onDone: {
          target: 'processing',
          actions: 'assignResult',
        },
        onError: [
          {
            guard: ({ event }) => {
              const error = (event as any).error
              const errData = error?.response?.data
              const code = errData?.errorCode || errData?.error
              return (
                code === 'auth.invalid_manager_credentials' ||
                code === 'auth.insufficient_manager_permissions'
              )
            },
            actions: assign({
              managerAuthError: ({ event }) => {
                const error = (event as any).error
                const errData = error?.response?.data
                const code = errData?.errorCode || errData?.error
                if (code === 'auth.invalid_manager_credentials') {
                  return errData?.message || 'Mã quản lý hoặc mã PIN không chính xác.'
                }
                if (code === 'auth.insufficient_manager_permissions') {
                  return errData?.message || 'Tài khoản quản lý không có quyền phê duyệt.'
                }
                return errData?.message || 'Thông tin phê duyệt của Quản lý không hợp lệ.'
              },
            }),
            target: 'waitingManagerApproval',
          },
          {
            guard: ({ context, event }) => {
              if (context.managerAuth === null) return false
              const error = (event as any).error
              const errData = error?.response?.data
              const code = errData?.errorCode || errData?.error
              const status = error?.response?.status
              return (
                status === 403 ||
                code === 'refund.cashier_threshold' ||
                code === 'order.manager_approval_required'
              )
            },
            actions: assign({
              managerAuthError: ({ event }) => {
                const error = (event as any).error
                const errData = error?.response?.data
                return errData?.message || 'Tài khoản không có quyền phê duyệt.'
              },
            }),
            target: 'waitingManagerApproval',
          },
          {
            guard: ({ context, event }) => {
              if (context.managerAuth !== null) return false
              const error = (event as any).error
              const errData = error?.response?.data
              const code = errData?.errorCode || errData?.error
              const status = error?.response?.status
              return (
                status === 403 ||
                code === 'refund.cashier_threshold' ||
                code === 'order.manager_approval_required'
              )
            },
            actions: assign({
              managerApprovalMessage: ({ event }) => {
                const error = (event as any).error
                const errData = error?.response?.data
                const code = errData?.errorCode || errData?.error

                if (code === 'refund.cashier_threshold') {
                  const refundAmount = errData?.context?.refundAmount
                  const threshold = errData?.context?.threshold
                  if (refundAmount !== undefined && threshold !== undefined) {
                    return `Hoàn ${formatCurrency(refundAmount, { suffix: 'đ' })} vượt ngưỡng ${formatCurrency(threshold, { suffix: 'đ' })} — cần manager duyệt.`
                  }
                }
                return 'Yêu cầu quyền Quản lý để thực hiện hoàn tiền.'
              },
            }),
            target: 'waitingManagerApproval',
          },
          {
            target: 'draft',
            actions: ['recordError', 'notifyError'],
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
          target: 'submittingReturn',
        },
        CANCEL: {
          target: 'draft',
          actions: assign({
            managerAuth: null,
            managerAuthError: null,
            managerApprovalMessage: null,
          }),
        },
      },
    },
    processing: {
      after: {
        700: {
          target: 'completed',
          actions: ['notifySuccess'],
        },
      },
    },
    completed: {
      on: {
        RESET: {
          target: 'idle',
          actions: 'resetContext',
        },
        START: {
          target: 'draft',
          actions: 'setOrder',
        },
      },
    },
  },
})
