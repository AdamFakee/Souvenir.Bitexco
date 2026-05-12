import { OrderStatus } from '@/shared/lib/database/models/order'
import { PaymentMethod } from '@/shared/lib/database/models/payment'
import { FeatureRemoteAPI, PullChangesParams, PushChangesParams } from '@/shared/lib/database/sync'
import { ItemSnapshot, PaymentSnapshot, TaxInfo } from '@/shared/lib/database/types'

/**
 * OrderRaw - Cấu trúc dữ liệu Đơn hàng khớp với Backend/Database
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
  created_at?: number
  updated_at?: number
}

/**
 * OrderItemRaw - Cấu trúc dữ liệu Chi tiết đơn hàng
 */
export interface OrderItemRaw {
  id: string
  order_id: string
  product_id: string
  product_name_snapshot: string
  price_snapshot: number
  quantity: number
  refunded_quantity: number
  subtotal: number
  tax_rate_snapshot: number
  tax_amount: number
  discount_amount: number
  is_deleted: boolean
  created_at?: number
  updated_at?: number
}

/**
 * PaymentRaw - Cấu trúc dữ liệu Thanh toán
 */
export interface PaymentRaw {
  id: string
  order_id: string
  method: PaymentMethod
  amount: number
  cash_tendered?: number
  cash_change?: number
  reference_code?: string
  card_type?: string
  is_deleted: boolean
  created_at?: number
  updated_at?: number
}

/**
 * OrderSyncChanges - Cấu trúc các thay đổi của Đơn hàng và các bảng liên quan
 */
export interface OrderSyncChanges {
  orders: {
    created: OrderRaw[]
    updated: OrderRaw[]
    deleted: string[]
  }
  order_items: {
    created: OrderItemRaw[]
    updated: OrderItemRaw[]
    deleted: string[]
  }
  payments: {
    created: PaymentRaw[]
    updated: PaymentRaw[]
    deleted: string[]
  }
}

/**
 * OrderRemoteAPI - Xử lý đồng bộ dữ liệu Đơn hàng với Server
 */
export const OrderRemoteAPI: FeatureRemoteAPI = {
  fetchChanges: async ({ lastPulledAt }: PullChangesParams): Promise<OrderSyncChanges> => {
    console.log('OrderRemoteAPI: Fetching changes (Pull)...', { lastPulledAt })

    // GIẢ LẬP: Trả về rỗng (Đơn hàng thường được tạo từ Client và Push lên Server)
    return {
      orders: { created: [], updated: [], deleted: [] },
      order_items: { created: [], updated: [], deleted: [] },
      payments: { created: [], updated: [], deleted: [] },
    }
  },

  pushChanges: async ({ changes }: PushChangesParams) => {
    // Ép kiểu 'changes' về OrderSyncChanges để code có gợi ý (Intellisense)
    const { orders, order_items, payments } = changes as unknown as OrderSyncChanges

    if (orders) {
      console.log('OrderRemoteAPI: Pushing orders...', {
        created: orders.created.length,
        updated: orders.updated.length,
        deleted: orders.deleted.length,
      })
      console.log('--- Orders Detail ---', orders)
    }

    if (order_items) {
      console.log('OrderRemoteAPI: Pushing order items...', {
        created: order_items.created.length,
        updated: order_items.updated.length,
        deleted: order_items.deleted.length,
      })
      console.log('--- Order Items Detail ---', order_items)
    }

    if (payments) {
      console.log('OrderRemoteAPI: Pushing payments...', {
        created: payments.created.length,
        updated: payments.updated.length,
        deleted: payments.deleted.length,
      })
      console.log('--- Payments Detail ---', payments)
    }

    // THỰC TẾ: Bạn sẽ gọi API ở đây để lưu các thay đổi này vào Backend
    // await apiClient.post('/sync/orders', { orders, order_items, payments })
  },
}
