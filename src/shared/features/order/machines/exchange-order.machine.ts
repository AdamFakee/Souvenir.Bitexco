import { useAppStore } from '@/shared/features/app/store/use-app-store'
import { calculateTotalTax } from '@/shared/features/payment/utils'
import { ProductRemoteAPI } from '@/shared/features/product/api/remote/product.remote.api'
import { toast, useConnectionStore } from '@/shared/store'
import { assign, fromPromise, setup } from 'xstate'
import {
  ExchangeOrderResult,
  ExchangeReplacementLineRequest,
  OrderApiError,
  OrderRemoteAPI,
} from '../api/remote/order.remote.api'
import { getOrderErrorMessage } from '../constants'
import { IOrder } from '../types'
import { checkCanExchange } from '../utils'

export interface ExchangeReturnLine {
  productId: string
  qty: number
}

export interface ExchangeReplacementLine {
  variantId: string
  productId: string
  unitId: string
  unitCode: string
  sku: string
  name: string
  barcode?: string
  price: number
  taxRate: number
  stock: number
  qty: number
}

export type ExchangePaymentMethod = 'cash' | 'qr_bidv' | 'card_bidv'

export interface ExchangeSelectedPayment {
  method: ExchangePaymentMethod
  amount: number
  provider?: string | null
  cardTerminalId?: string | null
  cashTendered?: number
  cashChange?: number
  referenceCode?: string
}

export interface ExchangeOrderContext {
  order: IOrder | null
  reason: string
  returnedLines: ExchangeReturnLine[]
  replacementLines: ExchangeReplacementLine[]
  pendingScanCodes: string[]
  idempotencyKey: string
  shiftId: string
  staffId: string
  selectedPayment: ExchangeSelectedPayment | null
  result: ExchangeOrderResult | null
  error: string | null
  lookupLines: any[]
}

export type ExchangeOrderEvent =
  | { type: 'START'; order: IOrder; shiftId: string; staffId: string }
  | { type: 'SET_REASON'; reason: string }
  | { type: 'SET_RETURN_LINE_QTY'; productId: string; qty: number }
  | { type: 'SET_ALL_RETURN_LINES' }
  | { type: 'CLEAR_RETURN_LINE'; productId: string }
  | { type: 'ADD_REPLACEMENT_ITEM'; product: ExchangeReplacementLine | ExchangeProductInput }
  | { type: 'UPDATE_REPLACEMENT_QTY'; variantId: string; qty: number }
  | { type: 'REMOVE_REPLACEMENT_ITEM'; variantId: string }
  | { type: 'SCAN_CODES'; codes: string[] }
  | { type: 'SUBMIT'; payment?: ExchangeSelectedPayment | null }
  | { type: 'PAYMENT_SUCCESS'; paymentResult: any }
  | { type: 'PAYMENT_CANCEL' }
  | { type: 'RESET' }

type ExchangeProductInput = {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  unitId?: string
  unitCode?: string
  barcode?: string
  taxRate?: number
}

const DEFAULT_CONTEXT: ExchangeOrderContext = {
  order: null,
  reason: '',
  returnedLines: [],
  replacementLines: [],
  pendingScanCodes: [],
  idempotencyKey: '',
  shiftId: '',
  staffId: '',
  selectedPayment: null,
  result: null,
  error: null,
  lookupLines: [],
}

const createIdempotencyKey = () => {
  const randomPart = Math.random().toString(36).slice(2)
  return `exchange-${Date.now()}-${randomPart}`
}

const getOriginalQuantity = (order: IOrder | null, productId: string) => {
  return order?.itemsSnapshot?.find((item) => item.productId === productId)?.quantity ?? 0
}

const getOriginalLineAmount = (order: IOrder | null, productId: string, qty: number) => {
  const item = order?.itemsSnapshot?.find((line) => line.productId === productId)
  if (!item || item.quantity <= 0 || qty <= 0) return 0
  return (item.subtotal / item.quantity) * qty
}

export const calculateExchangeReturnedValue = (
  order: IOrder | null,
  lines: ExchangeReturnLine[],
) => {
  return lines.reduce(
    (total, line) => total + getOriginalLineAmount(order, line.productId, line.qty),
    0,
  )
}

export const calculateExchangeReplacementSubtotal = (lines: ExchangeReplacementLine[]) => {
  return lines.reduce((total, line) => total + line.price * line.qty, 0)
}

export const calculateExchangeReplacementVat = (lines: ExchangeReplacementLine[]) => {
  return calculateTotalTax(
    lines.map((line) => ({
      id: line.variantId,
      product: {
        id: line.variantId,
        name: line.name,
        price: line.price,
        sku: line.sku,
        unit: line.unitCode,
        unitId: line.unitId,
        taxRate: line.taxRate,
        stock: line.stock,
      },
      quantity: line.qty,
      price: line.price,
    })),
  )
}

export const calculateExchangeReplacementValue = (lines: ExchangeReplacementLine[]) => {
  return calculateExchangeReplacementSubtotal(lines) + calculateExchangeReplacementVat(lines)
}

export const calculateExchangeDifference = (
  order: IOrder | null,
  returnedLines: ExchangeReturnLine[],
  replacementLines: ExchangeReplacementLine[],
) => {
  const returnedValue = calculateExchangeReturnedValue(order, returnedLines)
  const replacementValue = calculateExchangeReplacementValue(replacementLines)
  return Math.max(0, replacementValue - returnedValue)
}

const upsertReturnLineQuantity = (
  lines: ExchangeReturnLine[],
  productId: string,
  qty: number,
): ExchangeReturnLine[] => {
  const normalizedQty = Math.max(0, Math.floor(Number(qty) || 0))
  const nextLines = lines.filter((line) => line.productId !== productId)

  if (normalizedQty === 0) return nextLines
  return [...nextLines, { productId, qty: normalizedQty }]
}

const normalizeReplacementProduct = (
  product: ExchangeReplacementLine | ExchangeProductInput,
): ExchangeReplacementLine => {
  const existing = product as ExchangeReplacementLine
  const input = product as ExchangeProductInput
  const variantId = existing.variantId || input.id

  return {
    variantId,
    productId: existing.productId || input.id,
    unitId: existing.unitId || input.unitId || '',
    unitCode: existing.unitCode || input.unitCode || '',
    sku: input.sku || existing.sku || '',
    name: input.name || existing.name || '',
    barcode: input.barcode || existing.barcode,
    price: Number(input.price ?? existing.price ?? 0),
    taxRate: Number(input.taxRate ?? existing.taxRate ?? 0),
    stock: Number(input.stock ?? existing.stock ?? 0),
    qty: Math.max(1, Math.floor(Number(existing.qty || 1) || 1)),
  }
}

const addReplacementLine = (
  lines: ExchangeReplacementLine[],
  product: ExchangeReplacementLine | ExchangeProductInput,
) => {
  const normalized = normalizeReplacementProduct(product)
  const existing = lines.find((line) => line.variantId === normalized.variantId)

  if (!existing) return [...lines, normalized]

  return lines.map((line) =>
    line.variantId === normalized.variantId
      ? {
          ...line,
          qty: line.stock > 0 ? Math.min(line.qty + 1, line.stock) : line.qty + 1,
        }
      : line,
  )
}

const getValidationMessage = (context: ExchangeOrderContext) => {
  if (!useConnectionStore.getState().isNetworkConnected) {
    return 'Đổi hàng chỉ hỗ trợ khi có kết nối mạng.'
  }
  if (!context.shiftId)
    return 'Không tìm thấy ca làm việc hiện tại. Vui lòng kiểm tra lại trạng thái ca.'
  if (!context.staffId) return 'Không tìm thấy nhân viên đang đăng nhập. Vui lòng đăng nhập lại.'
  if (!context.order) return 'Không tìm thấy đơn hàng cần đổi.'
  if (!checkCanExchange(context.order)) {
    const isExpired = Date.now() - new Date(context.order.createdAt).getTime() > 24 * 60 * 60 * 1000
    if (isExpired) {
      return 'Đơn hàng đã quá hạn 1 ngày (24 giờ), không được phép đổi hàng.'
    }
    return 'Đơn hàng không đủ điều kiện đổi (trạng thái không hợp lệ, có voucher hoặc đã bị khóa đổi).'
  }

  const selectedReturnLines = context.returnedLines.filter((line) => line.qty > 0)
  if (selectedReturnLines.length === 0) return 'Vui lòng chọn ít nhất 1 sản phẩm cần trả.'

  const hasInvalidReturnQty = selectedReturnLines.some((line) => {
    const originalQuantity = getOriginalQuantity(context.order, line.productId)
    return line.qty <= 0 || line.qty > originalQuantity
  })
  if (hasInvalidReturnQty) return 'Số lượng trả hàng không hợp lệ.'

  const selectedReplacementLines = context.replacementLines.filter((line) => line.qty > 0)
  if (selectedReplacementLines.length === 0) return 'Vui lòng chọn ít nhất 1 sản phẩm đổi mới.'

  const hasInvalidReplacementQty = selectedReplacementLines.some((line) => {
    return line.qty <= 0 || (line.stock > 0 && line.qty > line.stock)
  })
  if (hasInvalidReplacementQty) return 'Số lượng hàng đổi mới không hợp lệ.'

  const returnedValue = calculateExchangeReturnedValue(context.order, context.returnedLines)
  const replacementValue = calculateExchangeReplacementValue(context.replacementLines)
  if (replacementValue < returnedValue) {
    return 'Giá trị hàng đổi mới phải lớn hơn hoặc bằng giá trị hàng trả.'
  }

  const difference = Math.max(0, replacementValue - returnedValue)
  if (difference > 0 && !context.selectedPayment) {
    return 'Vui lòng chọn phương thức thanh toán cho phần chênh lệch.'
  }
  if (difference > 0 && context.selectedPayment) {
    if (context.selectedPayment.amount < difference) {
      return 'Số tiền thanh toán chưa đủ phần chênh lệch.'
    }
  }

  return null
}

const toReplacementRequest = (line: ExchangeReplacementLine): ExchangeReplacementLineRequest => ({
  variantId: line.variantId,
  unitId: line.unitId,
  qty: line.qty,
  unitPrice: line.price,
  discountAmount: 0,
  taxRate: line.taxRate,
})

const lookupScannedProducts = async (codes: string[]) => {
  const isNetworkConnected = useConnectionStore.getState().isNetworkConnected
  const products: ExchangeReplacementLine[] = []
  const missingCodes: string[] = []

  if (!isNetworkConnected) {
    throw new Error('Đổi hàng chỉ hỗ trợ khi có kết nối mạng.')
  }

  const warehouseId = useAppStore.getState().appService?.getSnapshot().context.device?.warehouseId

  for (const code of codes) {
    const remoteResult = await ProductRemoteAPI.lookupProduct({
      barcode: code,
      warehouseId,
    })

    if (remoteResult) {
      products.push({
        variantId: remoteResult.variantId,
        productId: remoteResult.productId || remoteResult.variantId,
        name: remoteResult.productName,
        sku: remoteResult.sku,
        price: remoteResult.price,
        stock: remoteResult.available,
        unitId: remoteResult.unitId,
        unitCode: remoteResult.unitCode,
        barcode: remoteResult.barcode,
        taxRate: (remoteResult as any).taxRate ?? (remoteResult as any).tax_rate ?? 0,
        qty: 1,
      })
    } else {
      missingCodes.push(code)
    }
  }

  return { products, missingCodes }
}

export const exchangeOrderMachine = setup({
  types: {
    context: {} as ExchangeOrderContext,
    events: {} as ExchangeOrderEvent,
  },
  actors: {
    lookupOrderActor: fromPromise(async ({ input }: { input: string }): Promise<any> => {
      if (!input) throw new Error('Không tìm thấy thông tin đơn hàng.')
      return await OrderRemoteAPI.lookupOrder(input)
    }),
    scanLookupActor: fromPromise(
      async ({
        input,
      }: {
        input: string[]
      }): Promise<{ products: ExchangeReplacementLine[]; missingCodes: string[] }> => {
        return await lookupScannedProducts(input)
      },
    ),
    exchangeOrderActor: fromPromise(
      async ({ input }: { input: ExchangeOrderContext }): Promise<ExchangeOrderResult> => {
        if (!input.order) throw new Error('Không tìm thấy đơn hàng cần đổi.')

        const replacementValue = calculateExchangeReplacementValue(input.replacementLines)

        const mappedReturnLines = await Promise.all(
          input.returnedLines
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

        const returnedValue = calculateExchangeReturnedValue(input.order, input.returnedLines)
        const difference = Math.max(0, replacementValue - returnedValue)
        const payments =
          difference <= 0
            ? []
            : [
                {
                  method: input.selectedPayment?.method ?? 'cash',
                  amount: difference,
                  provider: input.selectedPayment?.provider ?? null,
                  cardTerminalId: input.selectedPayment?.cardTerminalId ?? null,
                },
              ]

        return await OrderRemoteAPI.exchangeOrder({
          orderId: input.order.id,
          idempotencyKey: input.idempotencyKey,
          reason: input.reason.trim(),
          shiftId: input.shiftId,
          staffId: input.staffId,
          returnLines: mappedReturnLines,
          newLines: input.replacementLines.filter((line) => line.qty > 0).map(toReplacementRequest),
          payments,
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
        idempotencyKey: createIdempotencyKey(),
      }
    }),
    setSelectedPayment: assign(({ event }) => {
      if (event.type !== 'SUBMIT') return {}
      return {
        selectedPayment: event.payment ?? null,
        error: null,
      }
    }),
    setReason: assign({
      reason: ({ event }) => (event.type === 'SET_REASON' ? event.reason : ''),
      error: null,
    }),
    setReturnLineQuantity: assign(({ context, event }) => {
      if (event.type !== 'SET_RETURN_LINE_QTY') return {}
      const maxQuantity = getOriginalQuantity(context.order, event.productId)
      const qty = Math.min(Math.max(0, Math.floor(Number(event.qty) || 0)), maxQuantity)
      return {
        returnedLines: upsertReturnLineQuantity(context.returnedLines, event.productId, qty),
        error: null,
      }
    }),
    setAllReturnLines: assign(({ context }) => ({
      returnedLines:
        context.order?.itemsSnapshot?.map((item) => ({
          productId: item.productId,
          qty: item.quantity,
        })) ?? [],
      error: null,
    })),
    clearReturnLine: assign(({ context, event }) => {
      if (event.type !== 'CLEAR_RETURN_LINE') return {}
      return {
        returnedLines: context.returnedLines.filter((line) => line.productId !== event.productId),
        error: null,
      }
    }),
    addReplacementItem: assign(({ context, event }) => {
      if (event.type !== 'ADD_REPLACEMENT_ITEM') return {}
      return {
        replacementLines: addReplacementLine(context.replacementLines, event.product),
        error: null,
      }
    }),
    updateReplacementQuantity: assign(({ context, event }) => {
      if (event.type !== 'UPDATE_REPLACEMENT_QTY') return {}
      const nextQty = Math.max(0, Math.floor(Number(event.qty) || 0))
      return {
        replacementLines: context.replacementLines
          .map((line) => {
            if (line.variantId !== event.variantId) return line
            const qty = line.stock > 0 ? Math.min(nextQty, line.stock) : nextQty
            return { ...line, qty }
          })
          .filter((line) => line.qty > 0),
        error: null,
      }
    }),
    removeReplacementItem: assign(({ context, event }) => {
      if (event.type !== 'REMOVE_REPLACEMENT_ITEM') return {}
      return {
        replacementLines: context.replacementLines.filter(
          (line) => line.variantId !== event.variantId,
        ),
        error: null,
      }
    }),
    setPendingScanCodes: assign(({ event }) => {
      if (event.type !== 'SCAN_CODES') return {}
      return {
        pendingScanCodes: event.codes.map((code) => code.trim()).filter(Boolean),
        error: null,
      }
    }),
    assignScannedProducts: assign(({ context, event }) => {
      const output = (event as any).output as {
        products: ExchangeReplacementLine[]
        missingCodes: string[]
      }
      let replacementLines = context.replacementLines
      output.products.forEach((product) => {
        replacementLines = addReplacementLine(replacementLines, product)
      })
      return {
        replacementLines,
        pendingScanCodes: [],
        error: output.missingCodes.length
          ? `Không tìm thấy sản phẩm cho mã: ${output.missingCodes.join(', ')}`
          : null,
      }
    }),
    notifyScanResult: ({ event }) => {
      const output = (event as any).output as {
        products: ExchangeReplacementLine[]
        missingCodes: string[]
      }
      output.products.forEach((product) => toast.success(`Đã thêm: ${product.name}`))
      output.missingCodes.forEach((code) => toast.error(`Không tìm thấy sản phẩm cho mã: ${code}`))
    },
    recordValidationError: assign({
      error: ({ context }) => getValidationMessage(context),
    }),
    notifyValidationError: ({ context }) => {
      const message = getValidationMessage(context)
      if (message) toast.error(message)
    },
    assignResult: assign({
      result: ({ event }) => (event as any).output,
      error: null,
    }),
    notifySuccess: ({ context }) => {
      toast.success(`Đã xử lý đổi hàng cho đơn hàng #${context.order?.id ?? ''}`)
    },
    notifyError: ({ event }) => {
      const error = (event as any).error
      const message =
        error instanceof OrderApiError
          ? getOrderErrorMessage(error.code, error.status)
          : error?.message || 'Có lỗi xảy ra khi xử lý đổi hàng.'
      toast.error(message)
    },
    recordError: assign({
      error: ({ event }) => {
        const error = (event as any).error
        if (error instanceof OrderApiError) return getOrderErrorMessage(error.code, error.status)
        return error?.message || 'Có lỗi xảy ra khi xử lý đổi hàng.'
      },
      pendingScanCodes: [],
    }),
    assignLookupLines: assign({
      lookupLines: ({ event }) => (event as any).output?.lines || [],
      error: null,
    }),
    resetContext: assign(DEFAULT_CONTEXT),
    showDevelopmentToast: () => {
      toast.info('Tính năng đang phát triển')
    },
  },
}).createMachine({
  id: 'exchangeOrder',
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
          target: 'draft',
          actions: 'setOrder',
        },
        SET_REASON: {
          actions: 'setReason',
        },
        SET_RETURN_LINE_QTY: {
          actions: 'setReturnLineQuantity',
        },
        SET_ALL_RETURN_LINES: {
          actions: 'setAllReturnLines',
        },
        CLEAR_RETURN_LINE: {
          actions: 'clearReturnLine',
        },
        ADD_REPLACEMENT_ITEM: {
          actions: 'addReplacementItem',
        },
        UPDATE_REPLACEMENT_QTY: {
          actions: 'updateReplacementQuantity',
        },
        REMOVE_REPLACEMENT_ITEM: {
          actions: 'removeReplacementItem',
        },
        SCAN_CODES: {
          target: 'lookingUpScan',
          actions: 'setPendingScanCodes',
        },
        SUBMIT: {
          target: 'validating',
          actions: 'setSelectedPayment',
        },
        RESET: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
    lookingUpScan: {
      invoke: {
        src: 'scanLookupActor',
        input: ({ context }) => context.pendingScanCodes,
        onDone: {
          target: 'draft',
          actions: ['assignScannedProducts', 'notifyScanResult'],
        },
        onError: {
          target: 'draft',
          actions: ['recordError', 'notifyError'],
        },
      },
    },
    validating: {
      always: [
        {
          target: 'submittingExchange',
          guard: 'canSubmit',
        },
        {
          target: 'draft',
          actions: ['recordValidationError', 'notifyValidationError'],
        },
      ],
    },
    submittingExchange: {
      invoke: {
        src: 'exchangeOrderActor',
        input: ({ context }) => context,
        onDone: [
          {
            target: 'waitingForOnlinePayment',
            guard: ({ event }) => {
              const payments = (event as any).output?.newOrder?.payments
              return payments?.some(
                (p: any) =>
                  p.state === 'INITIATED' && (p.method === 'qr_bidv' || p.method === 'card_bidv'),
              )
            },
            actions: 'assignResult',
          },
          {
            target: 'receivingReturnedItems',
            actions: 'assignResult',
          },
        ],
        onError: {
          target: 'draft',
          actions: ['recordError', 'notifyError'],
        },
      },
    },
    // Exchange đã commit; chờ capture QR/thẻ. Cancel → draft + key mới (không undo server).
    waitingForOnlinePayment: {
      on: {
        PAYMENT_SUCCESS: {
          target: 'receivingReturnedItems',
        },
        PAYMENT_CANCEL: {
          target: 'draft',
          actions: assign({
            result: null,
            selectedPayment: null,
            idempotencyKey: () => createIdempotencyKey(),
          }),
        },
      },
    },
    receivingReturnedItems: {
      after: {
        700: 'issuingReplacementItems',
      },
    },
    issuingReplacementItems: {
      after: {
        700: {
          target: 'completed',
          actions: 'notifySuccess',
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
