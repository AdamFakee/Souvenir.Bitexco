import { CategoryRemoteAPI } from '@/shared/features/category/api/remote/category.remote.api'
import { ProductRemoteAPI } from '@/shared/features/product/api/remote/product.remote.api'
import { SyncDatabaseChangeSet, synchronize } from '@nozbe/watermelondb/sync'
import { database } from '../database'

import { OrderLocalAPI } from '@/shared/features/order/api/local/order.local.api'
import {
  OrderRaw,
  OrderRemoteAPI,
  localIdToGuid,
} from '@/shared/features/order/api/remote/order.remote.api'

/**
 * SyncService - Quản lý đồng bộ dữ liệu Offline/Online.
 */
export const SyncService = {
  /**
   * Kéo dữ liệu danh mục (Product, Category,...) từ server bằng WatermelonDB.
   * Chạy nền định kỳ hoặc khi có kết nối mạng.
   */
  pullMasterData: async () => {
    try {
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
          const timestamp = lastPulledAt ?? null

          // Luôn lấy đầy đủ thay đổi của Product và Category
          const [product, category] = await Promise.all([
            ProductRemoteAPI.fetchChanges!({ lastPulledAt: timestamp }),
            CategoryRemoteAPI.fetchChanges!({ lastPulledAt: timestamp }),
          ])

          const changes: SyncDatabaseChangeSet = {
            products: product.products,
            categories: category.categories,
          }

          const nextTimestamp = product?.syncedAt || category?.syncedAt || Date.now()
          return { changes, timestamp: nextTimestamp }
        },
        pushChanges: async () => {
          // KHÔNG đẩy Orders thông qua WatermelonDB
        },
      })
    } catch (error) {
      throw error
    }
  },

  /**
   * Đồng bộ các đơn hàng được tạo lúc Offline lên Server.
   * Dùng cơ chế Outbox Pattern và Bulk Sync API.
   */
  drainOutbox: async () => {
    try {
      // 1. Lấy các đơn hàng chưa đồng bộ (is_synced = false)
      const unsyncedOrders = await OrderLocalAPI.getUnsyncedOrders()

      if (unsyncedOrders.length === 0) {
        return // Không có gì để sync
      }

      // 2. Chuyển đổi sang định dạng OrderRaw thô (raw JSON)
      const rawOrders: OrderRaw[] = unsyncedOrders.map((o) => ({
        id: localIdToGuid(o.id),
        shift_id: o.shiftId,
        staff_id: o.staffId,
        status: o.status,
        subtotal: o.subtotal,
        discount: o.discount,
        voucher_code: o.voucherCode || null,
        voucher_discount: o.voucherDiscount,
        total: o.total,
        total_tax: o.totalTax,
        note: o.note || null,
        refund_reason: o.refundReason || null,
        original_order_id: o.originalOrderId ? localIdToGuid(o.originalOrderId) : null,
        customer_tax_info: o.customerTaxInfo,
        items_snapshot: o.itemsSnapshot,
        payments_snapshot: o.paymentsSnapshot,
        is_deleted: o.isDeleted,
        created_at: o.createdAt.getTime(),
        updated_at: o.updatedAt.getTime(),
      }))
      // 3. Chia nhỏ (Chunking) thành từng cụm nhỏ (10 đơn/lần) để tránh quá tải payload
      const CHUNK_SIZE = 10
      for (let i = 0; i < rawOrders.length; i += CHUNK_SIZE) {
        const chunk = rawOrders.slice(i, i + CHUNK_SIZE)

        try {
          await OrderRemoteAPI.syncOfflineOrders(chunk)

          // 4. Đánh dấu các đơn trong chunk này đã đồng bộ thành công
          const chunkIds = chunk.map((o) => o.id)
          await OrderLocalAPI.markOrdersAsSynced(chunkIds)
        } catch {
          break
        }
      }
    } catch (error) {
      throw error
    }
  },
}
