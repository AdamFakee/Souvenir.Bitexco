import { SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync'
import { FeatureRemoteAPI, PullChangesParams, PushChangesParams } from '@/shared/lib/database/sync'

/**
 * ProductRemoteAPI - Xử lý đồng bộ dữ liệu Sản phẩm với Server
 */
import mockProducts from './mock-products.json'

/**
 * ProductRaw - Cấu trúc dữ liệu Sản phẩm khớp với Backend/Database
 */
export interface ProductRaw {
  id: string
  category_id: string
  sku: string
  name_en: string
  name_vi: string
  unit: string
  price: number
  tax_rate: number
  cost_price: number
  stock: number
  image?: string
  supplier: string
  is_active: boolean
  is_deleted: boolean
  created_at?: number
  updated_at?: number
}

/**
 * ProductSyncChanges - Cấu trúc các thay đổi của Sản phẩm
 */
export interface ProductSyncChanges {
  products: {
    created: ProductRaw[]
    updated: ProductRaw[]
    deleted: string[]
  }
}

export const ProductRemoteAPI: FeatureRemoteAPI = {
  fetchChanges: async ({ lastPulledAt }: PullChangesParams): Promise<ProductSyncChanges> => {
    console.log('ProductRemoteAPI: Fetching changes (Pull)...', { lastPulledAt })

    // GIẢ LẬP: Nếu là lần đầu tiên (lastPulledAt null), lấy toàn bộ mock data
    if (!lastPulledAt) {
      const now = Date.now()
      const products: ProductRaw[] = (mockProducts as any[]).map((p) => ({
        ...p,
        created_at: now,
        updated_at: now,
      }))

      return {
        products: { created: products, updated: [], deleted: [] },
      }
    }

    // GIẢ LẬP: Trả về rỗng nếu không có gì mới kể từ lastPulledAt
    return {
      products: { created: [], updated: [], deleted: [] },
    }
  },

  pushChanges: async ({ changes }: PushChangesParams) => {
    // Ép kiểu 'changes' về ProductSyncChanges để code có gợi ý (Intellisense)
    const { products } = changes as unknown as ProductSyncChanges

    if (!products) return

    const { created, updated, deleted } = products

    console.log('ProductRemoteAPI: Pushing changes to server...', {
      createdCount: created.length,
      updatedCount: updated.length,
      deletedCount: deleted.length,
    })

    // THỰC TẾ: Bạn sẽ gọi API ở đây
    // if (created.length > 0 || updated.length > 0 || deleted.length > 0) {
    //   await apiClient.post('/products/sync', { created, updated, deleted })
    // }
  },
}
