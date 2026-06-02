import { OrderStatus } from '@/shared/lib/database'
import { toast } from '@/shared/store'
import { assign, fromPromise, setup } from 'xstate'
import {
  OrderApiError,
  OrderRemoteAPI,
  RefundOrderLineRequest,
  RefundOrderResult,
} from '../api/remote/order.remote.api'
import { getOrderErrorMessage } from '../constants'
import { IOrder } from '../types'

export interface RefundOrderContext {
  order: IOrder | null
  reason: string
  lines: RefundOrderLineRequest[]
  refundAmount: number
  shiftId: string
  staffId: string
  result: RefundOrderResult | null
  error: string | null
}

export type RefundOrderEvent =
  | { type: 'START'; order: IOrder; shiftId: string; staffId: string }
  | { type: 'SET_REASON'; reason: string }
  | { type: 'SET_LINE_QTY'; productId: string; qty: number }
  | { type: 'SET_ALL_LINES' }
  | { type: 'CLEAR_LINE'; productId: string }
  | { type: 'SUBMIT' }
  | { type: 'CANCEL' }
  | { type: 'RESET' }

const DEFAULT_CONTEXT: RefundOrderContext = {
  order: null,
  reason: '',
  lines: [],
  refundAmount: 0,
  shiftId: '',
  staffId: '',
  result: null,
  error: null,
}

const getOriginalQuantity = (order: IOrder | null, productId: string) => {
  return order?.itemsSnapshot?.find((item) => item.productId === productId)?.quantity ?? 0
}

const upsertLineQuantity = (
  lines: RefundOrderLineRequest[],
  productId: string,
  qty: number,
): RefundOrderLineRequest[] => {
  const normalizedQty = Math.max(0, Math.floor(Number(qty) || 0))
  const nextLines = lines.filter((line) => line.productId !== productId)

  if (normalizedQty === 0) return nextLines
  return [...nextLines, { productId, qty: normalizedQty }]
}

const getValidationMessage = (context: RefundOrderContext) => {
  if (!context.shiftId)
    return 'Không tìm thấy ca làm việc hiện tại. Vui lòng kiểm tra lại trạng thái ca.'
  if (!context.staffId) return 'Không tìm thấy nhân viên đang đăng nhập. Vui lòng đăng nhập lại.'
  if (!context.order) return 'Không tìm thấy đơn hàng cần trả.'
  if (context.order.status !== OrderStatus.COMPLETED || context.order.canReturn === false) {
    return 'Trạng thái đơn hàng không cho phép trả hàng.'
  }
  const selectedLines = context.lines.filter((line) => line.qty > 0)
  if (selectedLines.length === 0) return 'Vui lòng chọn ít nhất 1 sản phẩm để trả hàng.'

  const hasInvalidQty = selectedLines.some((line) => {
    const originalQuantity = getOriginalQuantity(context.order, line.productId)
    return line.qty <= 0 || line.qty > originalQuantity
  })

  if (hasInvalidQty) return 'Số lượng trả hàng không hợp lệ.'
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

        return await OrderRemoteAPI.refundOrder({
          orderId: input.order.id,
          reason: input.reason.trim(),
          shiftId: input.shiftId,
          staffId: input.staffId,
          lines: input.lines.filter((line) => line.qty > 0),
        })
      },
    ),
  },
  guards: {
    canSubmit: ({ context }) => getValidationMessage(context) === null,
  },
  actions: {
    setOrder: assign(({ event }) => {
      if (event.type !== 'START') return {}
      return {
        ...DEFAULT_CONTEXT,
        order: event.order,
        shiftId: event.shiftId,
        staffId: event.staffId,
      }
    }),
    setReason: assign({
      reason: ({ event }) => (event.type === 'SET_REASON' ? event.reason : ''),
      error: null,
    }),
    setLineQuantity: assign(({ context, event }) => {
      if (event.type !== 'SET_LINE_QTY') return {}
      const maxQuantity = getOriginalQuantity(context.order, event.productId)
      const qty = Math.min(Math.max(0, Math.floor(Number(event.qty) || 0)), maxQuantity)
      return {
        lines: upsertLineQuantity(context.lines, event.productId, qty),
        error: null,
      }
    }),
    setAllLines: assign(({ context }) => ({
      lines:
        context.order?.itemsSnapshot?.map((item) => ({
          productId: item.productId,
          qty: item.quantity,
        })) ?? [],
      error: null,
    })),
    clearLine: assign(({ context, event }) => {
      if (event.type !== 'CLEAR_LINE') return {}
      return {
        lines: context.lines.filter((line) => line.productId !== event.productId),
        error: null,
      }
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
      toast.success(`Đã xử lý trả hàng cho đơn hàng #${context.order?.id ?? ''}`)
    },
    notifyError: ({ event }) => {
      const error = (event as any).error
      const message =
        error instanceof OrderApiError
          ? getOrderErrorMessage(error.code, error.status)
          : error?.message || 'Có lỗi xảy ra khi xử lý trả hàng.'
      toast.error(message)
    },
    recordError: assign({
      error: ({ event }) => {
        const error = (event as any).error
        if (error instanceof OrderApiError) return getOrderErrorMessage(error.code, error.status)
        return error?.message || 'Có lỗi xảy ra khi xử lý trả hàng.'
      },
    }),
    resetContext: assign(DEFAULT_CONTEXT),
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
        SET_LINE_QTY: {
          actions: 'setLineQuantity',
        },
        SET_ALL_LINES: {
          actions: 'setAllLines',
        },
        CLEAR_LINE: {
          actions: 'clearLine',
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
          target: 'receivingReturnedItems',
          actions: 'assignResult',
        },
        onError: {
          target: 'draft',
          actions: ['recordError', 'notifyError'],
        },
      },
    },
    receivingReturnedItems: {
      after: {
        700: 'refundProcessing',
      },
    },
    refundProcessing: {
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
