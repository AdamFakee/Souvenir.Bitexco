import { OrderRaw } from '@/features/order'
import {
  fetchAffiliateChanges,
  fetchPartnerChanges,
  getUnsyncedLocalOrders,
  localIdToGuid,
  markLocalOrdersSynced,
  syncOfflineOrders,
} from '@/features/order/api'
import { fetchProductChanges } from '@/features/product/api'
import { queryClient } from '@/shared/lib/react-query'
import { SyncDatabaseChangeSet, synchronize } from '@nozbe/watermelondb/sync'
import { database } from '../database'

/**
 * SyncService - Quản lý đồng bộ dữ liệu Offline/Online.
 */
export const SyncService = {
  /**
   * Kéo dữ liệu danh mục (Product, Partner, Affiliate) từ server bằng WatermelonDB.
   * Chạy nền định kỳ hoặc khi có kết nối mạng.
   */
  pullMasterData: async () => {
    try {
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
          const timestamp = lastPulledAt ?? null

          // Luôn lấy đầy đủ thay đổi của Product, Partner, Affiliate
          const [product, partner, affiliate] = await Promise.all([
            fetchProductChanges({ lastPulledAt: timestamp }),
            fetchPartnerChanges({ lastPulledAt: timestamp }),
            fetchAffiliateChanges({ lastPulledAt: timestamp }),
          ])

          const changes: SyncDatabaseChangeSet = {
            products: product.products,
            categories: { created: [], updated: [], deleted: [] },
            partners: partner.partners,
            affiliates: affiliate.affiliates,
          }

          const nextTimestamp =
            (product as any)?.syncedAt ||
            (partner as any)?.syncedAt ||
            (partner as any)?.timestamp ||
            (affiliate as any)?.timestamp ||
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
      const unsyncedOrders = await getUnsyncedLocalOrders()

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
          await syncOfflineOrders(chunk)

          // 4. Xóa các đơn trong chunk này khỏi local SQLite vì đã sync thành công
          const chunkIds = chunk.map((o) => o.id)
          await markLocalOrdersSynced(chunkIds)
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
