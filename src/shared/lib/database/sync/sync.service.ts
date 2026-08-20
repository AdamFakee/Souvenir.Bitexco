import { CategoryRemoteAPI } from '@/shared/features/category/api/remote/category.remote.api'
import { ProductRemoteAPI } from '@/shared/features/product/api/remote/product.remote.api'
import { SyncDatabaseChangeSet, synchronize } from '@nozbe/watermelondb/sync'
import { database } from '../database'

import { OrderLocalAPI } from '@/shared/features/order/api/local/order.local.api'
import { AffiliateRemoteAPI } from '@/shared/features/order/api/remote/affiliate.remote.api'
import {
  OrderRaw,
  OrderRemoteAPI,
  localIdToGuid,
} from '@/shared/features/order/api/remote/order.remote.api'
import { PartnerRemoteAPI } from '@/shared/features/order/api/remote/partner.remote.api'
import { queryClient } from '@/shared/lib/react-query'

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

          // Luôn lấy đầy đủ thay đổi của Product, Category, Partner, Affiliate
          const [product, category, partner, affiliate] = await Promise.all([
            ProductRemoteAPI.fetchChanges!({ lastPulledAt: timestamp }),
            CategoryRemoteAPI.fetchChanges!({ lastPulledAt: timestamp }),
            PartnerRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
            AffiliateRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
          ])

          const changes: SyncDatabaseChangeSet = {
            products: product.products,
            categories: category.categories,
            partners: partner.partners,
            affiliates: affiliate.affiliates,
          }

          const nextTimestamp =
            product?.syncedAt ||
            category?.syncedAt ||
            partner?.syncedAt ||
            affiliate?.syncedAt ||
            Date.now()
          return { changes, timestamp: nextTimestamp }
        },
        pushChanges: async () => {
          // KHÔNG đẩy Orders thông qua WatermelonDB
        },
      })
    } catch (error: any) {
      console.error(
        '[SyncService.pullMasterData] Lỗi kéo dữ liệu Master Data:',
        error?.response?.data || error?.message || error,
      )
      throw error
    }
  },

  /**
   * Đồng bộ các đơn hàng được tạo lúc Offline lên Server.
   * Dùng cơ chế Outbox Pattern và Bulk Sync API.
   * Sau khi sync thành công, đơn hàng sẽ được xóa vĩnh viễn khỏi Local DB (Delete on Sync).
   */
  drainOutbox: async () => {
    try {
      // 1. Lấy các đơn hàng chưa đồng bộ (is_synced = false)
      const unsyncedOrders = await OrderLocalAPI.getUnsyncedOrders()

      if (unsyncedOrders.length === 0) {
        return // Không có gì để sync
      }

      console.log(
        `[SyncService.drainOutbox] Bắt đầu đồng bộ ${unsyncedOrders.length} đơn hàng offline...`,
      )

      // 2. Chuyển đổi sang định dạng OrderRaw thô (raw JSON)
      const rawOrders: OrderRaw[] = unsyncedOrders.map((o) => ({
        id: o.id,
        code: o.id,
        order_code: o.id,
        shift_id: o.shiftId,
        staff_id: o.staffId,
        status: o.status,
        subtotal: o.subtotal,
        discount: o.discount,
        partner_id: o.partnerId || null,
        affiliate_id: o.affiliateId || null,
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

      let hasSyncedAny = false

      // 3. Chia nhỏ (Chunking) thành từng cụm nhỏ (10 đơn/lần) để tránh quá tải payload
      const CHUNK_SIZE = 10
      for (let i = 0; i < rawOrders.length; i += CHUNK_SIZE) {
        const chunk = rawOrders.slice(i, i + CHUNK_SIZE)

        try {
          console.log(
            `[SyncService.drainOutbox] Đang sync chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} đơn)...`,
          )
          await OrderRemoteAPI.syncOfflineOrders(chunk)

          // 4. Xóa các đơn trong chunk này khỏi local SQLite vì đã sync thành công
          const chunkIds = chunk.map((o) => o.id)
          await OrderLocalAPI.markOrdersAsSynced(chunkIds)
          hasSyncedAny = true
          console.log(
            `[SyncService.drainOutbox] Sync thành công chunk ${Math.floor(i / CHUNK_SIZE) + 1}`,
          )
        } catch (chunkError: any) {
          console.error(
            `[SyncService.drainOutbox] LỖI SYNC CHUNK ${Math.floor(i / CHUNK_SIZE) + 1}:`,
            chunkError?.response?.status,
            JSON.stringify(
              chunkError?.response?.data || chunkError?.message || chunkError,
              null,
              2,
            ),
          )
          break
        }
      }

      if (hasSyncedAny) {
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      }
    } catch (error: any) {
      console.error(
        '[SyncService.drainOutbox] Lỗi tổng quát khi sync đơn offline:',
        error?.response?.data || error?.message || error,
      )
      throw error
    }
  },
}
