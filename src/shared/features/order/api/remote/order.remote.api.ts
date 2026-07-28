import { Affiliate, AgentType } from '@/shared/features/pos'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import { OrderStatus } from '@/shared/lib/database'
import { ItemSnapshot, PaymentSnapshot, TaxInfo } from '@/shared/lib/database/types'
import { IBaseResponse, PagedResponse } from '@/shared/types/api'
import { endOfDay, startOfDay } from '@/shared/utils'
import {
  IOrder,
  OrderFulfillmentStatus,
  OrderInvoiceStatus,
  OrderPaymentStatus,
  OrderReturnStatus,
  OrderState,
  OrderStatusType,
  Partner,
  RefundReceiptData,
} from '../../types'
import { checkCanExchange, checkCanReturn } from '../../utils'

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

export type PosPaymentMethod = 'cash' | 'qr' | 'card' | 'qr_bidv' | 'card_bidv' | 'cong_no'

export interface PosPaymentRequest {
  method: PosPaymentMethod
  amount: number
  provider: string | null
  cardTerminalId: string | null
  cashTendered?: number
  cashChange?: number
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
  /** ID của HDV / Đại lý (nếu có). null = khách lẻ */
  affiliateId?: string | null
  /** ID đối tác công nợ (Đại lý) */
  partnerId?: string | null
  /** Key chống trùng lặp từ client */
  clientIdempotencyKey?: string | null
  /** Loại đối tượng: retail | collaborator | agent */
  agentType?: AgentType | null
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
  canExchange?: boolean
  createdAt: string | number | Date
  updatedAt: string | number | Date
  totalRefunded?: number
  refunds?: any[]
  refund?: RefundReceiptData | null
  agentType?: 'collaborator' | 'agent' | 'retail'
  affiliateId?: string | null
  partnerId?: string | null
  affiliate?: Affiliate | null
  partner?: Partner | null
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
  /** ID của HDV / CTV để lọc đơn hàng */
  affiliateId?: string | null
  /** ID của Đại lý để lọc đơn hàng */
  partnerId?: string | null
  /** Loại đối tượng: collaborator hoặc agent để lọc tất cả CTV hoặc Đại lý */
  agentType?: string | null
  /** Lọc theo phương thức thanh toán */
  paymentMethod?: string | null
}

/**
 * Tham số hoàn tiền full-order — BE tự resolve remaining lines từ orderId.
 */
export interface RefundOrderParams {
  orderId: string
  idempotencyKey: string
  reason: string
  shiftId: string
  staffId: string
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
  variantId: string
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
  returnLines: ExchangeReturnLineRequest[]
  newLines: ExchangeReplacementLineRequest[]
  payments: {
    method: 'cash' | 'qr_bidv' | 'card_bidv'
    amount: number
    provider?: string | null
    cardTerminalId?: string | null
  }[]
  managerAuth?: {
    employeeCode: string
    pin: string
  } | null
}

export interface ExchangeReceiptLine {
  productId: string
  sku?: string
  name: string
  qty: number
  unitPrice: number
  lineAmount: number
}

export interface PosReturnResponse {
  returnId: string
  returnCode: string
  orderId: string
  orderCode: string
  refundAmount: number
  status: string
  receipt?: RefundReceiptData
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

/** Hóa đơn đơn mới (hàng đổi vào) — in bill như checkout */
export interface ExchangeSaleReceiptLine {
  variantId?: string
  productId?: string
  sku?: string
  name: string
  qty: number
  unitPrice: number
  discountAmount?: number
  taxRate?: number
  taxAmount?: number
  lineTotal: number
}

export interface ExchangeSaleReceipt {
  orderId: string
  orderCode: string
  issuedAt?: string
  reason?: string
  originalOrderId?: string
  originalOrderCode?: string
  subTotal: number
  discountTotal?: number
  voucherDiscount?: number
  taxTotal: number
  grandTotal: number
  paidTotal?: number
  change?: number
  lines: ExchangeSaleReceiptLine[]
  payments?: { method?: string; amount?: number }[]
}

export interface ExchangeOrderResult {
  originalOrderId: string
  originalOrderCode: string
  return: PosReturnResponse
  newOrder: PosCheckoutResult
  refundValue: number
  newOrderTotal: number
  difference: number
  /** Hóa đơn hàng mua vào (đơn mới) — BE nên trả để FE in */
  receipt?: ExchangeSaleReceipt
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
  canReturn: checkCanReturn({
    status: order.status || order.state,
    canReturn: order.canReturn,
    voucherCode: order.voucherCode,
    voucherDiscount: order.voucherDiscount,
    discount: order.discount,
    returnStatus: order.returnStatus,
    paymentsSnapshot: order.paymentsSnapshot ?? [],
    createdAt:
      order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt).toISOString(),
  }),
  canExchange: checkCanExchange({
    status: order.status || order.state,
    canReturn: order.canReturn,
    canExchange: order.canExchange,
    voucherCode: order.voucherCode,
    voucherDiscount: order.voucherDiscount,
    discount: order.discount,
    returnStatus: order.returnStatus,
    paymentsSnapshot: order.paymentsSnapshot ?? [],
    createdAt:
      order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt).toISOString(),
    originalOrderId: order.originalOrderId,
  }),
  createdAt: new Date(order.createdAt),
  updatedAt: new Date(order.updatedAt),
  totalRefunded: order.totalRefunded ?? 0,
  refunds: order.refunds ?? [],
  refund: order.refund ?? undefined,
  agentType: order.agentType,
  affiliateId: order.affiliateId,
  partnerId: order.partnerId,
  affiliate: order.affiliate as Affiliate | null,
  partner: order.partner,
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
 * Tham số gọi API đối soát.
 * Cần truyền đúng 1 trong 2: partnerId hoặc affiliateId.
 */
export interface GetReconciliationParams {
  partnerId?: string | null
  affiliateId?: string | null
  dateFrom: Date
  dateTo: Date
}

/**
 * Kết quả đối soát trả về từ API — backend tính sẵn, FE chỉ hiển thị.
 */
export interface ReconciliationResult {
  ownerCode: string
  totalOrdersCount: number
  totalRevenue: number
  commissionRate: number
  commissionAmount: number
  dateFrom: string
  dateTo: string
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
            method: payment.method || 'cash',
            amount: payment.amount,
            cashTendered: payment.cashTendered ?? 0,
            cashChange: payment.cashChange ?? 0,
          })),
        })),
      }
      await AxiosService.getInstance().post('/v1/pos/sync/orders', payload)
    } catch (error) {
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

    if (params.affiliateId) {
      urlParams.append('affiliate_id', params.affiliateId)
    } else if (params.partnerId) {
      urlParams.append('partner_id', params.partnerId)
    } else if (params.agentType) {
      urlParams.append('agent_type', params.agentType)
    }

    if (params.paymentMethod) urlParams.append('payment_method', params.paymentMethod)

    if (status) {
      if (Array.isArray(status)) {
        status.forEach((s) => {
          if (s) urlParams.append('status', s)
        })
      } else if (typeof status === 'string' && status.includes(',')) {
        status.split(',').forEach((s) => {
          const trimmed = s.trim()
          if (trimmed) urlParams.append('status', trimmed)
        })
      } else {
        urlParams.append('status', status)
      }
    }
    try {
      const response = await AxiosService.getInstance().get<PagedResponse<OrderListApiItem>>(
        '/v1/pos/orders',
        { params: urlParams },
      )

      const rawData = response.data as {
        items?: OrderListApiItem[]
        data?: OrderListApiItem[]
        meta?: {
          total?: number
          totalCount?: number
          totalItems?: number
          total_items?: number
          totalRevenue?: number
          total_revenue?: number
          page?: number
          limit?: number
          pageSize?: number
          totalPages?: number
          hasNextPage?: boolean
        }
        totalCount?: number
        total?: number
        totalItems?: number
        total_items?: number
        totalRevenue?: number
        total_revenue?: number
        page?: number
        pageSize?: number
        limit?: number
        totalPages?: number
        hasNextPage?: boolean
      }
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
    } catch (error) {
      const typedError = error as {
        response?: { status?: number; data?: { error?: string; traceId?: string } }
        message?: string
      }
      const status = typedError?.response?.status
      const data = typedError?.response?.data
      const code = typeof data?.error === 'string' ? data.error : undefined
      const traceId = typeof data?.traceId === 'string' ? data.traceId : undefined

      throw new OrderApiError(code || typedError?.message || 'order.list_failed', {
        code,
        status,
        traceId,
      })
    }
  },

  /**
   * Tra cứu đơn hàng bằng code để xem cấu trúc phản hồi từ backend.
   */
  lookupOrder: async (code: string): Promise<unknown> => {
    const response = await AxiosService.getInstance().get<unknown>(`/v1/pos/orders/lookup`, {
      params: { code },
    })
    return response.data
  },

  /**
   * Trả hàng full-order online (atomic).
   * BE tự full remaining từ orderId — FE không gửi lines.
   * Backend trả raw JSON object, không có envelope { success, data }.
   */
  refundOrder: async (params: RefundOrderParams): Promise<RefundOrderResult> => {
    const { orderId, idempotencyKey, reason, shiftId, staffId, managerAuth } = params

    try {
      const response = await AxiosService.getInstance().post<RefundOrderResult>(
        `/v1/pos/orders/${orderId}/refund`,
        {
          idempotencyKey,
          reason,
          shiftId,
          staffId,
          ...(managerAuth
            ? {
                managerAuth: {
                  employeeCode: managerAuth.employeeCode,
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
    const {
      orderId,
      idempotencyKey,
      reason,
      shiftId,
      staffId,
      returnLines,
      newLines,
      payments,
      managerAuth,
    } = params

    try {
      const payload = {
        idempotencyKey,
        reason,
        shiftId,
        staffId,
        returnLines,
        newLines,
        payments,
        currency: 'VND',
        ...(managerAuth
          ? {
              managerAuth: {
                employeeCode: managerAuth.employeeCode,
                pin: managerAuth.pin,
              },
            }
          : {}),
      }

      console.log(
        `[OrderRemoteAPI] exchangeOrder request (orderId: ${orderId}) payload:`,
        JSON.stringify(payload, null, 2),
      )

      const response = await AxiosService.getInstance().post<ExchangeOrderResult>(
        `/v1/pos/orders/${orderId}/exchange`,
        payload,
      )

      console.log(
        `[OrderRemoteAPI] exchangeOrder response:`,
        JSON.stringify(response.data, null, 2),
      )
      return response.data
    } catch (error) {
      console.error(`[OrderRemoteAPI] exchangeOrder error:`, error)
      const typedError = error as {
        response?: { status?: number; data?: { error?: string; traceId?: string } }
        message?: string
      }
      const status = typedError?.response?.status
      const data = typedError?.response?.data
      const code = typeof data?.error === 'string' ? data.error : undefined
      const traceId = typeof data?.traceId === 'string' ? data.traceId : undefined

      throw new OrderApiError(code || typedError?.message || 'order.exchange_failed', {
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
          shiftId,
          staffId,
          reason,
          ...(managerAuth
            ? {
                managerAuth: {
                  employeeCode: managerAuth.employeeCode,
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
    console.log('[OrderRemoteAPI] checkout request payload:', JSON.stringify(payload, null, 2))
    try {
      const res = await AxiosService.getInstance().post<PosCheckoutResult>(
        '/v1/pos/checkout',
        payload,
      )
      console.log('[OrderRemoteAPI] checkout response:', JSON.stringify(res.data, null, 2))
      return res.data
    } catch (error) {
      console.error('[OrderRemoteAPI] checkout error:', error)
      throw error
    }
  },

  /**
   * Tra cứu danh sách HDV / Cộng tác viên (affiliate).
   */
  getAffiliates: async (params?: {
    q?: string
    limit?: number
    page?: number
    isActive?: boolean
    hasTransaction?: boolean
  }): Promise<{ items: Affiliate[]; totalCount: number; page: number; pageSize: number }> => {
    try {
      const response = await AxiosService.getInstance().get<
        | {
            items?: Record<string, unknown>[]
            totalCount?: number
            page?: number
            pageSize?: number
          }
        | Record<string, unknown>[]
      >('/v1/pos/affiliates', {
        params: {
          q: params?.q || undefined,
          limit: params?.limit || undefined,
          page: params?.page || undefined,
          isActive: params?.isActive !== undefined ? params.isActive : undefined,
          hasTransaction: params?.hasTransaction !== undefined ? params.hasTransaction : undefined,
        },
      })

      const rawItems = Array.isArray(response.data) ? response.data : response.data.items || []

      const items = rawItems.map((item) => ({
        id: String(item.id),
        code: String(item.code),
        name: String(item.name),
        phone: item.phone ? String(item.phone) : '',
        isDebt: false,
        agentType: 'collaborator' as const,
        isActive: item.isActive !== undefined ? Boolean(item.isActive) : item.state === 'ACTIVE',
      }))

      const data = response.data as { totalCount?: number; page?: number; pageSize?: number }
      return {
        items,
        totalCount: data.totalCount || items.length,
        page: data.page || params?.page || 0,
        pageSize: data.pageSize || params?.limit || 10,
      }
    } catch (err) {
      throw err
    }
  },

  /**
   * Tra cứu danh sách Đối tác/Đại lý (partner).
   */
  getPartners: async (params?: {
    search?: string
    page?: number
    limit?: number
    isActive?: boolean
    hasTransaction?: boolean
  }): Promise<{ items: Partner[]; totalCount: number; page: number; pageSize: number }> => {
    try {
      const response = await AxiosService.getInstance().get<
        { items?: Partner[]; totalCount?: number; page?: number; pageSize?: number } | Partner[]
      >('/v1/pos/partners', {
        params: {
          search: params?.search || undefined,
          page: params?.page || undefined,
          limit: params?.limit || undefined,
          isActive: params?.isActive !== undefined ? params.isActive : undefined,
          hasTransaction: params?.hasTransaction !== undefined ? params.hasTransaction : undefined,
        },
      })

      const items = Array.isArray(response.data) ? response.data : response.data.items || []
      const data = response.data as { totalCount?: number; page?: number; pageSize?: number }

      return {
        items,
        totalCount: data.totalCount || items.length,
        page: data.page || params?.page || 0,
        pageSize: data.pageSize || params?.limit || 10,
      }
    } catch (err) {
      throw err
    }
  },

  /**
   * Lấy thông tin Biên lai (Receipt) theo orderId
   */
  getReceipt: async (orderId: string): Promise<unknown> => {
    const response = await AxiosService.getInstance().get<unknown>(`/v1/pos/receipt/${orderId}`)
    return response.data
  },

  /**
   * L\u1ea5y th\u00f4ng tin \u0111\u1ed1i so\u00e1t theo \u0111\u1ed1i t\u00e1c ho\u1eb7c c\u1ed9ng t\u00e1c vi\u00ean.
   * API t\u1ef1 t\u00ednh to\u00e1n doanh s\u1ed1, hoa h\u1ed3ng — FE ch\u1ec9 hi\u1ec3n th\u1ecb.
   */
  getReconciliation: async (params: GetReconciliationParams): Promise<ReconciliationResult> => {
    const { partnerId, affiliateId, dateFrom, dateTo } = params

    const urlParams = new URLSearchParams()
    if (partnerId) urlParams.append('partnerId', partnerId)
    if (affiliateId) urlParams.append('affiliateId', affiliateId)
    urlParams.append('dateFrom', startOfDay(dateFrom).toISOString())
    urlParams.append('dateTo', endOfDay(dateTo).toISOString())

    try {
      const response = await AxiosService.getInstance().get<ReconciliationResult>(
        '/v1/pos/reconciliation',
        { params: urlParams },
      )
      return response.data
    } catch (error) {
      const typedError = error as {
        response?: { status?: number; data?: { error?: string; traceId?: string } }
        message?: string
      }
      const status = typedError?.response?.status
      const data = typedError?.response?.data
      const code = typeof data?.error === 'string' ? data.error : undefined
      const traceId = typeof data?.traceId === 'string' ? data.traceId : undefined
      throw new OrderApiError(code || typedError?.message || 'order.reconciliation_failed', {
        code,
        status,
        traceId,
      })
    }
  },
}
