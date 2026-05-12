import { FeatureRemoteAPI, PullChangesParams, PushChangesParams } from '@/shared/lib/database/sync'
import { ShiftStatus } from '@/shared/lib/database/models/shift'

/**
 * ShiftRaw - Cấu trúc dữ liệu Ca làm việc khớp với Backend/Database
 */
export interface ShiftRaw {
  id: string
  staff_id: string
  device_id: string
  start_time: number
  end_time?: number
  starting_cash: number
  expected_ending_cash: number
  actual_ending_cash?: number
  difference_cash?: number
  discrepancy_reason?: string
  cash_revenue: number
  qr_revenue: number
  total_orders: number
  status: ShiftStatus
  is_deleted: boolean
  created_at?: number
  updated_at?: number
}

/**
 * ShiftSyncChanges - Cấu trúc các thay đổi của Ca làm việc
 */
export interface ShiftSyncChanges {
  shifts: {
    created: ShiftRaw[]
    updated: ShiftRaw[]
    deleted: string[]
  }
}

/**
 * ShiftRemoteAPI - Xử lý đồng bộ dữ liệu Ca làm việc với Server
 */
export const ShiftRemoteAPI: FeatureRemoteAPI = {
  fetchChanges: async ({ lastPulledAt }: PullChangesParams): Promise<ShiftSyncChanges> => {
    console.log('ShiftRemoteAPI: Fetching changes (Pull)...', { lastPulledAt })

    // GIẢ LẬP: Trả về rỗng (Ca làm việc thường được tạo từ Client và Push lên Server)
    return {
      shifts: { created: [], updated: [], deleted: [] },
    }
  },

  pushChanges: async ({ changes }: PushChangesParams) => {
    // Ép kiểu 'changes' về ShiftSyncChanges để code có gợi ý (Intellisense)
    const { shifts } = changes as unknown as ShiftSyncChanges

    if (!shifts) return

    const { created, updated, deleted } = shifts

    console.log('ShiftRemoteAPI: Pushing changes to server...', {
      createdCount: created.length,
      updatedCount: updated.length,
      deletedCount: deleted.length,
    })

    // THỰC TẾ: Bạn sẽ gọi API ở đây
    // if (created.length > 0 || updated.length > 0 || deleted.length > 0) {
    //   await apiClient.post('/sync/shifts', { created, updated, deleted })
    // }
  },
}
