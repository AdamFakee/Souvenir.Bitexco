import { SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync'
import { FeatureRemoteAPI, PullChangesParams, PushChangesParams } from '@/shared/lib/database/sync'

/**
 * ProductRemoteAPI - Giả lập các thay đổi từ Server cho Sản phẩm
 */
import mockProducts from './mock-products.json'

export const ProductRemoteAPI: FeatureRemoteAPI = {
  fetchChanges: async ({ lastPulledAt }: PullChangesParams): Promise<SyncDatabaseChangeSet> => {
    console.log('ProductRemoteAPI: Fetching changes (Pull)...', { lastPulledAt })
    if (!lastPulledAt) {
      const now = Date.now()
      const products = mockProducts.map((p: any) => ({
        ...p,
        created_at: now,
        updated_at: now,
      }))

      return {
        products: { created: products, updated: [], deleted: [] },
      } as any
    }

    return {
      products: { created: [], updated: [], deleted: [] },
    } as any
  },

  pushChanges: async ({ changes }: PushChangesParams) => {
    const { products } = changes as any
    console.log('ProductRemoteAPI: Pushing changes to server...', {
      productsCount: products?.created?.length || 0,
    })
  },
}
