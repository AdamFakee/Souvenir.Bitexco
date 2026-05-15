import { toast } from '@/shared/store'
import { assign, fromPromise, setup } from 'xstate'
import { OrderRemoteAPI } from '../api/remote/order.remote.api'
import { IOrder } from '../types'

export interface RefundOrderContext {
  order: IOrder | null
  reason: string
  shiftId: string
  error: string | null
}

export type RefundOrderEvent =
  | { type: 'START'; order: IOrder; shiftId: string }
  | { type: 'SET_REASON'; reason: string }
  | { type: 'SUBMIT' }
  | { type: 'CANCEL' }
  | { type: 'RESET' }

export const refundOrderMachine = setup({
  types: {
    context: {} as RefundOrderContext,
    events: {} as RefundOrderEvent,
  },
  actors: {
    refundOrderActor: fromPromise(
      async ({ input }: { input: { orderId: string; reason: string; shiftId: string } }) => {
        const response = await OrderRemoteAPI.refundOrder({
          orderId: input.orderId,
          reason: input.reason,
          shiftId: input.shiftId,
        })

        if (!response.success) {
          throw new Error(response.message || 'Hoàn tiền thất bại')
        }

        return response.data
      },
    ),
  },
  actions: {
    notifySuccess: ({ context }) => {
      if (context.order) {
        toast.success(`Đã hoàn tiền cho đơn hàng #${context.order.id}`)
      }
    },
    notifyError: ({ event }) => {
      const error = (event as any).error?.message || 'Có lỗi xảy ra khi thực hiện hoàn tiền.'
      toast.error(error)
    },
    setOrder: assign({
      order: ({ event }) => (event as any).order,
      shiftId: ({ event }) => (event as any).shiftId,
      reason: '',
      error: null,
    }),
    setReason: assign({
      reason: ({ event }) => (event as any).reason,
    }),
    resetContext: assign({
      order: null,
      reason: '',
      error: null,
    }),
  },
}).createMachine({
  id: 'refundOrder',
  initial: 'idle',
  context: {
    order: null,
    reason: '',
    shiftId: '',
    error: null,
  },
  states: {
    idle: {
      on: {
        START: {
          actions: ['resetContext', 'setOrder'],
        },
        SET_REASON: {
          actions: 'setReason',
        },
        SUBMIT: {
          target: 'refunding',
        },
        CANCEL: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
    refunding: {
      invoke: {
        src: 'refundOrderActor',
        input: ({ context }) => ({
          orderId: context.order?.id || '',
          reason: context.reason,
          shiftId: context.shiftId,
        }),
        onDone: {
          target: 'success',
          actions: 'notifySuccess',
        },
        onError: {
          target: 'idle',
          actions: 'notifyError',
        },
      },
    },
    success: {
      on: {
        RESET: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
  },
})
