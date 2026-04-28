import { CategoryRemoteAPI } from '@/shared/features/category'
import { ProductRemoteAPI } from '@/shared/features/product'
import { SyncDatabaseChangeSet, synchronize } from '@nozbe/watermelondb/sync'
import { database } from '../database'

/**
 * SyncService - Bộ não điều phối toàn bộ quá trình đồng bộ
 */
export const SyncService = {
  performSync: async () => {
    try {
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
          const timestamp = lastPulledAt ?? null

          // Gom data từ tất cả feature
          const [productChanges, categoryChanges] = await Promise.all([
            ProductRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
            CategoryRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
          ])

          // Hợp nhất các thay đổi
          const changes: SyncDatabaseChangeSet = {
            ...productChanges,
            ...categoryChanges,
          }

          return { changes, timestamp: Date.now() }
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
          const timestamp = lastPulledAt ?? null

          // Phân phối dữ liệu đẩy lên cho từng feature
          await Promise.all([
            ProductRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp }),
            CategoryRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp }),
          ])
        },
      })
    } catch (error) {
      console.error('--- SYNC FAILED ---', error)
      throw error
    }
  },
}
