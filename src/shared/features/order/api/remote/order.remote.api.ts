import { AxiosService } from '@/shared/lib/axios/axios.service'
import { OrderStatus } from '@/shared/lib/database'
import { IBaseResponse } from '@/shared/types/api'
import ordersJson from './order.mock.json'

import { ItemSnapshot, PaymentSnapshot, TaxInfo } from '@/shared/lib/database/types'
import { IOrder } from '../../types'

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
  voucher_code?: string
  voucher_discount: number
  total: number
  total_tax: number
  note?: string
  refund_reason?: string
  original_order_id?: string
  customer_tax_info: TaxInfo | null
  items_snapshot: ItemSnapshot[]
  payments_snapshot: PaymentSnapshot[]
  is_deleted: boolean
  created_at: number
  updated_at: number
}

const MOCK_ORDERS = ordersJson as OrderRaw[]

/**
 * Cấu trúc Request Params cho việc lấy danh sách đơn hàng từ xa.
 */
export interface GetRemoteOrdersParams {
  status?: OrderStatus | null
  searchQuery?: string
  dateFrom?: Date | null
  dateTo?: Date | null
  page?: number
  limit?: number
}

/**
 * Tham số hoàn tiền đơn hàng
 */
export interface RefundOrderLineRequest {
  productId: string
  qty: number
}

export interface RefundOrderParams {
  orderId: string
  idempotencyKey: string
  reason: string
  shiftId: string
  staffId: string
  lines: RefundOrderLineRequest[]
}

export interface RefundReceiptLine {
  productId: string
  sku?: string
  name: string
  orderedQty: number
  returnedQty: number
  remainingQty: number
  unitPrice: number
  lineRefundAmount: number
  isReturned: boolean
}

export interface RefundReceiptData {
  orderId: string
  orderCode?: string
  returnId?: string
  returnCode?: string
  reason: string
  refundedAt?: string
  refundAmount: number
  lines: RefundReceiptLine[]
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

export interface CancelOrderParams {
  orderId: string
  shiftId: string
  staffId: string
  reason?: string
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

    console.log(`OrderRemoteAPI: Syncing ${orders.length} offline orders to server...`)

    try {
      const payload = { orders }
      await AxiosService.getInstance().post('/v1/pos/sync/orders', payload)
    } catch (error) {
      console.error('OrderRemoteAPI: Failed to sync offline orders', error)
      throw error
    }
  },

  /**
   * Lấy danh sách đơn hàng (MOCK - Sẽ thay bằng API thật sau)
   */
  getOrders: async (params: GetRemoteOrdersParams): Promise<IBaseResponse<IOrder[]>> => {
    const { status, searchQuery, page = 1, limit = 20 } = params

    // Giả lập độ trễ mạng
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Filter theo status
    let filtered = MOCK_ORDERS
    if (status) {
      filtered = filtered.filter((o) => o.status === status)
    }

    // Filter theo searchQuery (ID)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((o) => o.id.toLowerCase().includes(query))
    }

    const total = filtered.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedData = filtered.slice(offset, offset + limit).map((o) => ({
      id: o.id,
      shiftId: o.shift_id,
      staffId: o.staff_id,
      status: o.status,
      subtotal: o.subtotal,
      discount: o.discount,
      voucherCode: o.voucher_code,
      voucherDiscount: o.voucher_discount,
      total: o.total,
      totalTax: o.total_tax,
      note: o.note,
      refundReason: o.refund_reason,
      originalOrderId: o.original_order_id,
      customerTaxInfo: o.customer_tax_info,
      itemsSnapshot: o.items_snapshot,
      paymentsSnapshot: o.payments_snapshot,
      isDeleted: o.is_deleted,
      canReturn: o.status === OrderStatus.COMPLETED,
      createdAt: new Date(o.created_at),
      updatedAt: new Date(o.updated_at),
    }))

    return {
      success: true,
      status_code: 200,
      message: 'Lấy danh sách đơn hàng thành công',
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        timestamp: Date.now(),
      },
      error: null,
    }
  },

  /**
   * Trả hàng/hoàn tiền online bằng endpoint atomic.
   * Backend trả raw JSON object, không có envelope { success, data }.
   */
  refundOrder: async (params: RefundOrderParams): Promise<RefundOrderResult> => {
    const { orderId, idempotencyKey, reason, shiftId, staffId, lines } = params

    try {
      const response = await AxiosService.getInstance().post<RefundOrderResult>(
        `/v1/pos/orders/${orderId}/refund`,
        {
          idempotencyKey,
          reason,
          shift_id: shiftId,
          staff_id: staffId,
          lines,
        },
      )

      return response.data
    } catch (error: any) {
      const status = error?.response?.status
      const data = error?.response?.data
      const code = typeof data?.error === 'string' ? data.error : undefined
      const traceId = typeof data?.traceId === 'string' ? data.traceId : undefined

      throw new OrderApiError(code || error?.message || 'order.refund_failed', {
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
    const { orderId, shiftId, staffId, reason } = params

    try {
      const res = await AxiosService.getInstance().post<CancelOrderResult>(
        `/v1/pos/orders/${orderId}/cancel`,
        {
          shift_id: shiftId,
          staff_id: staffId,
          reason,
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
