import { ProductRemoteAPI } from '@/shared/features/product/api/remote/product.remote.api'
import { OrderStatus } from '@/shared/lib/database'
import { toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { assign, fromPromise, setup } from 'xstate'
import {
  OrderRemoteAPI,
  RefundOrderLineRequest,
  RefundOrderResult,
} from '../api/remote/order.remote.api'
import { getOrderErrorMessage } from '../constants'
import { IOrder } from '../types'

export interface RefundOrderContext {
  order: IOrder | null
  reason: string
  lines: { productId: string; qty: number }[]
  lookupLines: any[]
  idempotencyKey: string
  refundAmount: number
  shiftId: string
  staffId: string
  result: RefundOrderResult | null
  error: string | null
  managerAuth: { employeeCode: string; pin: string } | null
  managerAuthError: string | null
  managerApprovalMessage: string | null
}

export type RefundOrderEvent =
  | { type: 'START'; order: IOrder; shiftId: string; staffId: string }
  | { type: 'SET_REASON'; reason: string }
  | { type: 'SET_LINE_QTY'; productId: string; qty: number }
  | { type: 'SET_ALL_LINES' }
  | { type: 'CLEAR_LINE'; productId: string }
  | { type: 'SUBMIT' }
  | { type: 'SUBMIT_MANAGER_PIN'; managerAuth: { employeeCode: string; pin: string } }
  | { type: 'CANCEL' }
  | { type: 'RESET' }

const DEFAULT_CONTEXT: RefundOrderContext = {
  order: null,
  reason: '',
  lines: [],
  lookupLines: [],
  idempotencyKey: '',
  refundAmount: 0,
  shiftId: '',
  staffId: '',
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

const getOriginalQuantity = (order: IOrder | null, productId: string) => {
  return order?.itemsSnapshot?.find((item) => item.productId === productId)?.quantity ?? 0
}

const upsertLineQuantity = (
  lines: { productId: string; qty: number }[],
  productId: string,
  qty: number,
): { productId: string; qty: number }[] => {
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
  if (!context.lookupLines || context.lookupLines.length === 0) {
    return 'Chưa tải xong hoặc không tìm thấy thông tin chi tiết đơn hàng trực tuyến.'
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
    lookupOrderActor: fromPromise(async ({ input }: { input: string }): Promise<any> => {
      if (!input) throw new Error('Không tìm thấy thông tin đơn hàng.')
      const response = await OrderRemoteAPI.lookupOrder(input)
      return response
    }),
    refundOrderActor: fromPromise(
      async ({ input }: { input: RefundOrderContext }): Promise<RefundOrderResult> => {
        if (!input.order) throw new Error('Không tìm thấy đơn hàng cần trả.')

        const mappedLines: RefundOrderLineRequest[] = await Promise.all(
          input.lines
            .filter((line) => line.qty > 0)
            .map(async (line) => {
              const itemSnapshot = input.order?.itemsSnapshot?.find(
                (item) => item.productId === line.productId,
              )
              const localIndex =
                input.order?.itemsSnapshot?.findIndex(
                  (item) => item.productId === line.productId,
                ) ?? -1

              let matchedLookupLine = null

              // 1. Try direct ID match
              let found = input.lookupLines?.find(
                (l) => l.variantId === line.productId || l.productId === line.productId,
              )

              if (found) {
                matchedLookupLine = found
              } else if (localIndex !== -1 && input.lookupLines && input.lookupLines[localIndex]) {
                // 2. Try index-based price match
                const candidate = input.lookupLines[localIndex]
                const snapshotPrice =
                  itemSnapshot && itemSnapshot.quantity > 0
                    ? itemSnapshot.subtotal / itemSnapshot.quantity
                    : 0
                if (Math.abs(snapshotPrice - candidate.unitPrice) < 2) {
                  matchedLookupLine = candidate
                }
              }

              // 3. Try fallback match by price only
              if (!matchedLookupLine && input.lookupLines) {
                const snapshotPrice =
                  itemSnapshot && itemSnapshot.quantity > 0
                    ? itemSnapshot.subtotal / itemSnapshot.quantity
                    : 0
                const foundByPrice = input.lookupLines.find(
                  (l) => Math.abs(l.unitPrice - snapshotPrice) < 2,
                )
                if (foundByPrice) {
                  matchedLookupLine = foundByPrice
                }
              }

              let variantId = matchedLookupLine?.variantId

              // 4. Try online SKU lookup if variantId is still unknown
              if (!variantId && itemSnapshot?.sku) {
                try {
                  const remoteProduct = await ProductRemoteAPI.lookupProduct({
                    sku: itemSnapshot.sku,
                  })
                  if (remoteProduct?.variantId) {
                    variantId = remoteProduct.variantId
                  }
                } catch {}
              }

              // Final fallback
              if (!variantId) {
                variantId = line.productId
              }

              return {
                variantId,
                qty: line.qty,
              }
            }),
        )

        const payload = {
          orderId: input.order.id,
          idempotencyKey: input.idempotencyKey,
          reason: input.reason.trim(),
          shiftId: input.shiftId,
          staffId: input.staffId,
          lines: mappedLines,
          managerAuth: input.managerAuth,
        }
        try {
          const result = await OrderRemoteAPI.refundOrder(payload)
          return result
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
      return {
        ...DEFAULT_CONTEXT,
        order: event.order,
        shiftId: event.shiftId,
        staffId: event.staffId,
        idempotencyKey: createIdempotencyKey(),
      }
    }),
    setReason: assign({
      reason: ({ event }) => (event.type === 'SET_REASON' ? event.reason : ''),
      error: null,
    }),
    setLineQuantity: assign(({ context, event }) => {
      if (event.type !== 'SET_LINE_QTY' || !context.lookupLines?.length) return {}
      const maxQuantity = getOriginalQuantity(context.order, event.productId)
      const qty = Math.min(Math.max(0, Math.floor(Number(event.qty) || 0)), maxQuantity)
      return {
        lines: upsertLineQuantity(context.lines, event.productId, qty),
        error: null,
      }
    }),
    setAllLines: assign(({ context }) => {
      if (!context.lookupLines?.length) return {}
      return {
        lines:
          context.order?.itemsSnapshot?.map((item) => ({
            productId: item.productId,
            qty: item.quantity,
          })) ?? [],
        error: null,
      }
    }),
    clearLine: assign(({ context, event }) => {
      if (event.type !== 'CLEAR_LINE' || !context.lookupLines?.length) return {}
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
    assignLookupLines: assign({
      lookupLines: ({ event }) => (event as any).output?.lines || [],
      error: null,
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
          target: 'fetchingOrderDetails',
          actions: 'setOrder',
        },
      },
    },
    fetchingOrderDetails: {
      invoke: {
        src: 'lookupOrderActor',
        input: ({ context }) => context.order?.id ?? '',
        onDone: {
          target: 'draft',
          actions: 'assignLookupLines',
        },
        onError: {
          target: 'draft',
          actions: ['recordError', 'notifyError'],
        },
      },
    },
    draft: {
      on: {
        START: {
          target: 'fetchingOrderDetails',
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
          target: 'fetchingOrderDetails',
          actions: 'setOrder',
        },
      },
    },
  },
})
