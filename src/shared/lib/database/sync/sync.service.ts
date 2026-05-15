import { CategoryRemoteAPI } from '@/shared/features/category'
import { OrderRemoteAPI } from '@/shared/features/order'
import { ProductRemoteAPI } from '@/shared/features/product'
import { SyncDatabaseChangeSet, synchronize } from '@nozbe/watermelondb/sync'
import { database } from '../database'

/**
 * SyncService - Chỉ dùng cho mục đích Full Sync (Đồng bộ toàn bộ) định kỳ.
 * Đối với các hành động cần tốc độ cao (như tạo đơn), hãy gọi API trực tiếp.
 */
export const SyncService = {
  performSync: async () => {
    try {
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
          const timestamp = lastPulledAt ?? null

          // Luôn luôn lấy đầy đủ thay đổi của tất cả feature
          const [product, category] = await Promise.all([
            ProductRemoteAPI.fetchChanges!({ lastPulledAt: timestamp }),
            CategoryRemoteAPI.fetchChanges!({ lastPulledAt: timestamp }),
            // Orders chỉ push, không pull
          ])

          const changes: SyncDatabaseChangeSet = {
            ...product,
            ...category,
          }

          return { changes, timestamp: Date.now() }
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
          const timestamp = lastPulledAt ?? null

          // Product & Category: Backend tự xử lý, chỉ cần push Orders
          await OrderRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp })
        },
      })
    } catch (error) {
      console.error('--- SYNC FAILED ---', error)
      throw error
    }
  },
}
