import { FeatureRemoteAPI, PullChangesParams } from '@/shared/lib/database/sync'

/**
 * CategoryRaw - Cấu trúc dữ liệu Danh mục khớp với Backend/Database
 */
export interface CategoryRaw {
  id: string
  name: string
  color?: string
  display_order: number
  is_deleted: boolean
  created_at?: number
  updated_at?: number
}

/**
 * CategorySyncChanges - Cấu trúc các thay đổi của Danh mục
 */
export interface CategorySyncChanges {
  categories: {
    created: CategoryRaw[]
    updated: CategoryRaw[]
    deleted: string[]
  }
}

/**
 * CategoryRemoteAPI - Xử lý đồng bộ dữ liệu Danh mục với Server
 */
export const CategoryRemoteAPI: FeatureRemoteAPI = {
  fetchChanges: async ({ lastPulledAt }: PullChangesParams): Promise<CategorySyncChanges> => {
    // GIẢ LẬP: Trả về rỗng (Thường được pull từ Server)
    return {
      categories: { created: [], updated: [], deleted: [] },
    }
  },

  pushChanges: async () => {
    // Không đẩy thay đổi lên vì Category là read-only trên Client
  },
}
