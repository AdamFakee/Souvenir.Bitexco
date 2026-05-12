import { StaffRemoteAPI } from '@/shared/features/auth'
import { CategoryRemoteAPI } from '@/shared/features/category'
import { OrderRemoteAPI } from '@/shared/features/order'
import { ProductRemoteAPI } from '@/shared/features/product'
import { ShiftRemoteAPI } from '@/shared/features/shift'
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
          const [product, category, order, shift, staff] = await Promise.all([
            ProductRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
            CategoryRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
            OrderRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
            ShiftRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
            StaffRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
          ])

          const changes: SyncDatabaseChangeSet = {
            ...product,
            ...category,
            ...order,
            ...shift,
            ...staff,
          }

          return { changes, timestamp: Date.now() }
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
          const timestamp = lastPulledAt ?? null

          // Đẩy tất cả thay đổi local lên server
          await Promise.all([
            ProductRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp }),
            CategoryRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp }),
            OrderRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp }),
            ShiftRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp }),
            StaffRemoteAPI.pushChanges(),
          ])
        },
      })
    } catch (error) {
      console.error('--- SYNC FAILED ---', error)
      throw error
    }
  },
}
