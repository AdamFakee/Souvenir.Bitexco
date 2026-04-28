import { SyncDatabaseChangeSet, synchronize } from '@nozbe/watermelondb/sync'
import { database } from '../database'
// import { MenuRemoteAPI } from '@/shared/features/menu'
// import { TableRemoteAPI } from '@/shared/features/table'
// import { OrderRemoteAPI } from '@/shared/features/order'
// import { ShiftRemoteAPI } from '@/shared/features/shift'
// import { ZoneRemoteAPI } from '@/shared/features/zone'
// import { SessionRemoteAPI } from '@/shared/features/session'

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
          const [
            // menuChanges,
            // tableChanges,
            // orderChanges,
            // shiftChanges,
            // zoneChanges,
            // sessionChanges,
          ] = await Promise.all([
            // MenuRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
            // TableRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
            // OrderRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
            // ShiftRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
            // ZoneRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
            // SessionRemoteAPI.fetchChanges({ lastPulledAt: timestamp }),
          ])

          // Hợp nhất các thay đổi
          const changes: SyncDatabaseChangeSet = {
            // ...menuChanges,
            // ...tableChanges,
            // ...orderChanges,
            // ...shiftChanges,
            // ...zoneChanges,
            // ...sessionChanges,
          }

          return { changes, timestamp: Date.now() }
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
          const timestamp = lastPulledAt ?? null

          // Phân phối dữ liệu đẩy lên cho từng feature
          await Promise.all([
            // MenuRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp }),
            // TableRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp }),
            // OrderRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp }),
            // ShiftRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp }),
            // ZoneRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp }),
            // SessionRemoteAPI.pushChanges({ changes, lastPulledAt: timestamp }),
          ])
        },
      })
    } catch (error) {
      console.error('--- SYNC FAILED ---', error)
      throw error
    }
  },
}
