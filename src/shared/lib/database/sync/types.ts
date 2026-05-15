import { SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync'

export type PullChangesParams = {
  lastPulledAt: number | null
}

export type PushChangesParams = {
  changes: SyncDatabaseChangeSet
  lastPulledAt: number | null
}

/**
 * Interface cho Remote API của từng Feature
 * Đảm bảo tính nhất quán khi gom dữ liệu tại Sync Service
 */
export interface FeatureRemoteAPI {
  /**
   * Lấy các thay đổi từ server kể từ thời điểm lastPulledAt
   */
  fetchChanges?: (params: PullChangesParams) => Promise<any>

  /**
   * Đẩy các thay đổi từ local lên server
   */
  pushChanges: (params: PushChangesParams) => Promise<void>
}
