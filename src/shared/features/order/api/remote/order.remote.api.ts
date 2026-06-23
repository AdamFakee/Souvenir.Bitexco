import { AxiosService } from '@/shared/lib/axios/axios.service'
import { OrderStatus } from '@/shared/lib/database'
import { ItemSnapshot, PaymentSnapshot, TaxInfo } from '@/shared/lib/database/types'
import { IBaseResponse, PagedResponse } from '@/shared/types/api'
import { endOfDay, startOfDay } from '@/shared/utils'
import {
  IOrder,
  RefundReceiptData,
  OrderState,
  OrderPaymentStatus,
  OrderFulfillmentStatus,
  OrderInvoiceStatus,
  OrderReturnStatus,
  OrderStatusType,
} from '../../types'
import { checkCanReturn } from '../../utils'

// ─── POS Atomic Checkout ──────────────────────────────────────────────────────

export interface PosCartLine {
  variantId: string
  unitId: string
  qty: number
  unitPrice: number
  discountAmount: number
  /** Tỷ lệ thuế dạng thập phân: 0.1 = 10% */
  taxRate: number
  notes?: string
}

export type PosPaymentMethod = 'cash' | 'qr' | 'card' | 'qr_bidv' | 'card_bidv'

export interface PosPaymentRequest {
  method: PosPaymentMethod
  amount: number
  provider: string | null
  cardTerminalId: string | null
}

export interface PosCheckoutRequest {
  cashSessionId: string
  customerId: string | null
  currency: string
  notes: string | null
  lines: PosCartLine[]
  payments: PosPaymentRequest[]
  voucherCode: string | null
  issueInvoice: boolean
  customerName: string | null
  customerTaxId: string | null
  customerAddress: string | null
}

export interface PosCheckoutResult {
  orderCode: string
  orderId: string
  subTotal: number
  discountTotal: number
  voucherDiscount: number
  taxTotal: number
  grandTotal: number
  paidTotal: number
  change: number
  status: OrderStatus
  payments?: {
    paymentId: string
    method: string
    amount: number
    state: string
  }[]
}

/**
 * OrderRaw - Cấu trúc dữ liệu Đơn hàng khớp 100% với Backend/Database (Wire format).
 * Phải giữ nguyên snake_case, không kế thừa từ UI interface.
 */
export interface OrderRaw {
  id: string
  shift_id: string
  staff_id: string
  status: OrderStatus
  subtotal: number
  discount: number
  voucher_code?: string | null
  voucher_discount: number
  total: number
  total_tax: number
  note?: string | null
  refund_reason?: string | null
  original_order_id?: string | null
  customer_tax_info: TaxInfo | null
  items_snapshot: ItemSnapshot[]
  payments_snapshot: PaymentSnapshot[]
  is_deleted: boolean
  created_at: number
  updated_at: number
}

interface OrderListApiItem {
  id: string
  code?: string | null
  shiftId: string
  staffId: string
  staffName?: string | null
  status: OrderStatusType
  state?: OrderState | null
  paymentStatus?: OrderPaymentStatus | null
  fulfillmentStatus?: OrderFulfillmentStatus | null
  invoiceStatus?: OrderInvoiceStatus | null
  returnStatus?: OrderReturnStatus | null
  subtotal: number
  discount: number
  voucherCode?: string | null
  voucherDiscount: number
  total: number
  totalTax: number
  paidTotal?: number
  note?: string | null
  refundReason?: string | null
  originalOrderId?: string | null
  originalOrderCode?: string | null
  customerTaxInfo: TaxInfo | null
  itemsSnapshot?: ItemSnapshot[] | null
  paymentsSnapshot?: PaymentSnapshot[] | null
  isDeleted: boolean
  canReturn?: boolean
  createdAt: string | number | Date
  updatedAt: string | number | Date
  totalRefunded?: number
  refunds?: any[]
  refund?: RefundReceiptData | null
}

/**
 * Cấu trúc Request Params cho việc lấy danh sách đơn hàng từ xa.
 */
export interface GetRemoteOrdersParams {
  status?: any
  searchQuery?: string
  dateFrom?: Date | null
  dateTo?: Date | null
  page?: number
  limit?: number
  /** Mã nhân viên để lọc đơn hàng. null hoặc undefined = tất cả nhân viên */
  staffId?: string | null
  /** ID của ca làm việc để lọc đơn hàng */
  shiftId?: string | null
}

/**
 * Tham số hoàn tiền đơn hàng
 */
export interface RefundOrderLineRequest {
  variantId: string
  qty: number
}

export interface RefundOrderParams {
  orderId: string
  idempotencyKey: string
  reason: string
  shiftId: string
  staffId: string
  lines: RefundOrderLineRequest[]
  managerAuth?: {
    employeeCode: string
    pin: string
  } | null
}

export interface RefundOrderResult {
  returnId?: string
  returnCode?: string
  orderId: string
  orderCode?: string
  refundAmount: number
  status?: 'COMPLETED' | 'REFUND_PROCESSING' | 'FAILED'
  receipt?: RefundReceiptData
}

export interface ExchangeReturnLineRequest {
  productId: string
  qty: number
}

export interface ExchangeReplacementLineRequest {
  variantId: string
  unitId: string
  qty: number
  unitPrice: number
  discountAmount: number
  taxRate: number
  notes?: string
}

export interface ExchangeOrderParams {
  orderId: string
  idempotencyKey: string
  reason: string
  shiftId: string
  staffId: string
  returnedLines: ExchangeReturnLineRequest[]
  replacementLines: ExchangeReplacementLineRequest[]
}

export interface ExchangeReceiptLine {
  productId: string
  sku?: string
  name: string
  qty: number
  unitPrice: number
  lineAmount: number
}

export interface ExchangeReceiptData {
  exchangeId?: string
  exchangeCode?: string
  orderId: string
  orderCode?: string
  exchangedAt?: string
  reason?: string
  returnedValue: number
  replacementValue: number
  differenceAmount: number
  returnedLines: ExchangeReceiptLine[]
  replacementLines: ExchangeReceiptLine[]
}

export interface ExchangeOrderResult {
  exchangeId?: string
  exchangeCode?: string
  orderId: string
  orderCode?: string
  returnedValue: number
  replacementValue: number
  differenceAmount: number
  status?: 'COMPLETED' | 'EXCHANGE_PROCESSING' | 'FAILED'
  receipt?: ExchangeReceiptData
}

export interface CancelOrderParams {
  orderId: string
  shiftId: string
  staffId: string
  reason?: string
  managerAuth?: {
    employeeCode: string
    pin: string
  } | null
}

export interface CancelOrderResult {
  orderId: string
  orderCode?: string
  status: 'CANCELLED'
  cancelledAt?: string
}

export class OrderApiError extends Error {
  code?: string
  status?: number
  traceId?: string

  constructor(message: string, options?: { code?: string; status?: number; traceId?: string }) {
    super(message)
    this.name = 'OrderApiError'
    this.code = options?.code
    this.status = options?.status
    this.traceId = options?.traceId
  }
}

/**
 * OrderSyncChanges
 */
export interface OrderSyncChanges {
  orders: {
    created: OrderRaw[]
    updated: OrderRaw[]
    deleted: string[]
  }
}

const mapOrderListApiItemToIOrder = (order: OrderListApiItem): IOrder => ({
  id: order.id,
  code: order.code ?? null,
  shiftId: order.shiftId,
  staffId: order.staffId,
  staffName: order.staffName ?? null,
  // Ưu tiên sử dụng field `status` cho việc hiển thị badge label ở FE, fallback về state
  status: (order.status || order.state) as OrderStatusType,
  state: order.state ?? null,
  paymentStatus: order.paymentStatus ?? null,
  fulfillmentStatus: order.fulfillmentStatus ?? null,
  invoiceStatus: order.invoiceStatus ?? null,
  returnStatus: order.returnStatus ?? null,
  subtotal: order.subtotal ?? 0,
  discount: order.discount ?? 0,
  voucherCode: order.voucherCode ?? undefined,
  voucherDiscount: order.voucherDiscount ?? 0,
  total: order.total ?? 0,
  totalTax: order.totalTax ?? 0,
  paidTotal: order.paidTotal,
  note: order.note ?? undefined,
  refundReason: order.refundReason ?? undefined,
  originalOrderId: order.originalOrderId ?? undefined,
  originalOrderCode: order.originalOrderCode ?? null,
  customerTaxInfo: order.customerTaxInfo ?? null,
  itemsSnapshot: order.itemsSnapshot ?? [],
  paymentsSnapshot: order.paymentsSnapshot ?? [],
  isDeleted: order.isDeleted ?? false,
  // Trạng thái cho phép trả hàng theo helper thống nhất
  canReturn:
    order.canReturn ??
    checkCanReturn({ status: order.status || order.state, canReturn: order.canReturn }),
  createdAt: new Date(order.createdAt),
  updatedAt: new Date(order.updatedAt),
  totalRefunded: order.totalRefunded ?? 0,
  refunds: order.refunds ?? [],
  refund: order.refund ?? undefined,
})

export const generateGuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const localIdToGuid = (localId: string): string => {
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (guidRegex.test(localId)) {
    return localId
  }
  let hex = ''
  for (let i = 0; i < localId.length; i++) {
    const code = localId.charCodeAt(i)
    hex += code.toString(16).padStart(2, '0')
  }
  hex = hex.padEnd(32, '0').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/**
 * OrderRemoteAPI - Xử lý đồng bộ dữ liệu Đơn hàng với Server
 */
export const OrderRemoteAPI = {
  /**
   * Đồng bộ hàng loạt đơn hàng offline lên server (Bulk Sync)
   */
  syncOfflineOrders: async (orders: OrderRaw[]): Promise<void> => {
    if (!orders || orders.length === 0) {
      return
    }
    try {
      const payload = {
        orders: orders.map((order) => ({
          id: order.id,
          shiftId: order.shift_id,
          staffId: order.staff_id,
          status: order.status,
          subTotal: order.subtotal,
          discount: order.discount,
          voucherCode: order.voucher_code || null,
          voucherDiscount: order.voucher_discount,
          totalTax: order.total_tax,
          total: order.total,
          note: order.note || null,
          refundReason: order.refund_reason || null,
          originalOrderId: order.original_order_id || null,
          customerTaxInfo: order.customer_tax_info || null,
          createdAt: new Date(order.created_at).toISOString(),
          updatedAt: new Date(order.updated_at).toISOString(),
          itemsSnapshot: (order.items_snapshot || []).map((item) => ({
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.subtotal,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            discountAmount: item.discountAmount,
          })),
          paymentsSnapshot: (order.payments_snapshot || []).map((payment) => ({
            method: (payment.method || 'CASH').toUpperCase(),
            amount: payment.amount,
            cashTendered: payment.cashTendered ?? 0,
            cashChange: payment.cashChange ?? 0,
          })),
        })),
      }
      await AxiosService.getInstance().post('/v1/pos/sync/orders', payload)
    } catch (error: any) {
      throw error
    }
  },

  /**
   * Lấy danh sách đơn hàng từ server.
   */
  getOrders: async (params: GetRemoteOrdersParams): Promise<IBaseResponse<IOrder[]>> => {
    const { status, searchQuery, dateFrom, dateTo, page = 1, limit = 20, staffId, shiftId } = params
    const normalizedSearchQuery = searchQuery?.trim()

    const urlParams = new URLSearchParams()
    urlParams.append('page', String(page))
    urlParams.append('limit', String(limit))

    if (normalizedSearchQuery) {
      urlParams.append('q', normalizedSearchQuery)
    }

    if (dateFrom) {
      urlParams.append('date_from', startOfDay(dateFrom).toISOString())
    }

    if (dateTo) {
      urlParams.append('date_to', endOfDay(dateTo).toISOString())
    }

    if (staffId) {
      urlParams.append('staff_id', staffId)
    }

    if (shiftId) {
      urlParams.append('shift_id', shiftId)
    }

    if (status) {
      const statusArray = Array.isArray(status) ? status : [status]
      if (statusArray.length > 0) {
        const joinedStatus = statusArray.join(',')
        urlParams.append('status', joinedStatus)
        urlParams.append('state', joinedStatus)
      }
    }
    try {
      const response = await AxiosService.getInstance().get<PagedResponse<OrderListApiItem>>(
        '/v1/pos/orders',
        { params: urlParams },
      )

      const rawData = response.data as any
      const items = rawData.items || rawData.data || (Array.isArray(rawData) ? rawData : [])

      const meta = rawData.meta || {}

      const totalCount =
        meta.total ?? meta.totalCount ?? rawData.totalCount ?? rawData.total ?? items.length
      const totalItems =
        meta.totalItems ?? meta.total_items ?? rawData.totalItems ?? rawData.total_items ?? 0
      const totalRevenue =
        meta.totalRevenue ??
        meta.total_revenue ??
        rawData.totalRevenue ??
        rawData.total_revenue ??
        0

      const currentPage = meta.page ?? rawData.page ?? page
      const pageSize = meta.limit ?? meta.pageSize ?? rawData.pageSize ?? rawData.limit ?? limit
      const totalPages =
        meta.totalPages ??
        rawData.totalPages ??
        (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0)
      const hasNextPage = meta.hasNextPage ?? rawData.hasNextPage ?? currentPage < totalPages

      return {
        success: true,
        status_code: 200,
        message: 'Lấy danh sách đơn hàng thành công',
        data: items.map(mapOrderListApiItemToIOrder),
        meta: {
          total: totalCount,
          totalItems,
          totalRevenue,
          page: currentPage,
          limit: pageSize,
          totalPages,
          hasNextPage,
          timestamp: Date.now(),
        },
        error: null,
      }
    } catch (error: any) {
      const status = error?.response?.status
      const data = error?.response?.data
      const code = typeof data?.error === 'string' ? data.error : undefined
      const traceId = typeof data?.traceId === 'string' ? data.traceId : undefined

      throw new OrderApiError(code || error?.message || 'order.list_failed', {
        code,
        status,
        traceId,
      })
    }
  },

  /**
   * Tra cứu đơn hàng bằng code để xem cấu trúc phản hồi từ backend.
   */
  lookupOrder: async (code: string): Promise<any> => {
    const response = await AxiosService.getInstance().get<any>(`/v1/pos/orders/lookup`, {
      params: { code },
    })
    return response.data
  },

  /**
   * Trả hàng/hoàn tiền online bằng endpoint atomic.
   * Backend trả raw JSON object, không có envelope { success, data }.
   */
  refundOrder: async (params: RefundOrderParams): Promise<RefundOrderResult> => {
    const { orderId, idempotencyKey, reason, shiftId, staffId, lines, managerAuth } = params

    try {
      const response = await AxiosService.getInstance().post<RefundOrderResult>(
        `/v1/pos/orders/${orderId}/refund`,
        {
          idempotency_key: idempotencyKey,
          reason,
          shift_id: shiftId,
          staff_id: staffId,
          lines,
          ...(managerAuth
            ? {
                manager_auth: {
                  employee_code: managerAuth.employeeCode,
                  pin: managerAuth.pin,
                },
              }
            : {}),
        },
      )

      return response.data
    } catch (error) {
      throw error
    }
  },

  /**
   * Đổi hàng online bằng endpoint atomic.
   */
  exchangeOrder: async (params: ExchangeOrderParams): Promise<ExchangeOrderResult> => {
    const { orderId, idempotencyKey, reason, shiftId, staffId, returnedLines, replacementLines } =
      params

    try {
      const response = await AxiosService.getInstance().post<ExchangeOrderResult>(
        `/v1/pos/orders/${orderId}/exchange`,
        {
          idempotencyKey,
          reason,
          shift_id: shiftId,
          staff_id: staffId,
          returned_lines: returnedLines,
          replacement_lines: replacementLines,
        },
      )

      return response.data
    } catch (error: any) {
      const status = error?.response?.status
      const data = error?.response?.data
      const code = typeof data?.error === 'string' ? data.error : undefined
      const traceId = typeof data?.traceId === 'string' ? data.traceId : undefined

      throw new OrderApiError(code || error?.message || 'order.exchange_failed', {
        code,
        status,
        traceId,
      })
    }
  },

  /**
   * Hủy đơn hàng (Remote API)
   */
  cancelOrder: async (params: CancelOrderParams): Promise<CancelOrderResult> => {
    const { orderId, shiftId, staffId, reason, managerAuth } = params

    try {
      const res = await AxiosService.getInstance().post<CancelOrderResult>(
        `/v1/pos/orders/${orderId}/cancel`,
        {
          shift_id: shiftId,
          staff_id: staffId,
          reason,
          ...(managerAuth
            ? {
                manager_auth: {
                  employee_code: managerAuth.employeeCode,
                  pin: managerAuth.pin,
                },
              }
            : {}),
        },
      )
      return res.data
    } catch (error) {
      throw error
    }
  },

  /**
   * Thanh toán atomic — gọi trực tiếp khi Online, không qua SQLite local.
   */
  checkout: async (payload: PosCheckoutRequest): Promise<PosCheckoutResult> => {
    const res = await AxiosService.getInstance().post<PosCheckoutResult>(
      '/v1/pos/checkout',
      payload,
    )
    return res.data
  },
}
