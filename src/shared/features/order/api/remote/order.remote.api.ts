import { OrderStatus } from '@/shared/lib/database'
import { FeatureRemoteAPI, PushChangesParams } from '@/shared/lib/database/sync'
import { ItemSnapshot, PaymentSnapshot, TaxInfo } from '@/shared/lib/database/types'
import { IBaseResponse } from '@/shared/types/api'

/**
 * OrderRaw - Cấu trúc dữ liệu Đơn hàng khớp với Backend/Database.
 * Bao gồm cả items và payments snapshots.
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
 * OrderSyncChanges - Chỉ còn duy nhất bảng orders vì items/payments đã được gộp vào snapshot.
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
export const OrderRemoteAPI: FeatureRemoteAPI = {
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
}
