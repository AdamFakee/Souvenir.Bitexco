import { AxiosService } from '@/shared/lib/axios/axios.service'
import { OrderStatus } from '@/shared/lib/database'
import { PushChangesParams } from '@/shared/lib/database/sync'
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
export interface RefundOrderParams {
  orderId: string
  reason: string
  shiftId: string
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
  pushChanges: async ({ changes }: PushChangesParams) => {
    // Ép kiểu để có gợi ý code
    const { orders } = changes as unknown as OrderSyncChanges

    if (orders) {
      console.log('OrderRemoteAPI: Pushing orders (with nested snapshots)...', {
        created: orders.created.length,
        updated: orders.updated.length,
        deleted: orders.deleted.length,
      })

      /**
       * LƯU Ý CHO BACKEND:
       * 1. Nhận mảng 'orders.created' và thực hiện bulk insert/upsert.
       * 2. Dữ liệu chi tiết nằm trong 'items_snapshot' và 'payments_snapshot' (JSON).
       * 3. Backend có thể chủ động parse JSON này để lưu vào bảng riêng ở Server nếu cần,
       *    hoặc lưu nguyên JSON nếu DB Server hỗ trợ (như PostgreSQL/MongoDB).
       */

      // GIẢ LẬP GỌI API:
      // const response = await apiClient.post<IBaseResponse<null>>('/sync/orders', { orders })

      // LOGIC CHECK LỖI:
      // if (!response.success) {
      //   // BẮT BUỘC: Throw lỗi để WatermelonDB không đánh dấu bản ghi là "đã push".
      //   // Việc throw này giúp hệ thống tự động retry ở lần sync kế tiếp.
      //   throw new Error(response.message || 'Push sync orders failed')
      // }

      console.log('--- Orders Detail Pushed ---', orders)
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
   * Hoàn tiền đơn hàng (Remote API)
   * Thao tác này sẽ thực hiện trực tiếp trên Server.
   */
  refundOrder: async (params: RefundOrderParams): Promise<IBaseResponse<null>> => {
    const { orderId, reason, shiftId } = params

    // Giả lập độ trễ mạng
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log('OrderRemoteAPI: Refunding order...', { orderId, reason, shiftId })

    // GIẢ LẬP GỌI API THẬT:
    // const response = await apiClient.post<IBaseResponse<null>>(`/orders/${orderId}/refund`, {
    //   reason,
    //   shift_id: shiftId
    // })
    // return response

    return {
      success: true,
      status_code: 200,
      message: 'Hoàn tiền đơn hàng thành công',
      data: null,
      meta: null,
      error: null,
    }
  },

  /**
   * Thanh toán atomic — gọi trực tiếp khi Online, không qua SQLite local.
   */
  checkout: async (payload: PosCheckoutRequest): Promise<IBaseResponse<PosCheckoutResult>> => {
    const res = await AxiosService.getInstance().post<IBaseResponse<PosCheckoutResult>>(
      '/v1/pos/checkout',
      payload,
    )
    return res.data
  },
}
