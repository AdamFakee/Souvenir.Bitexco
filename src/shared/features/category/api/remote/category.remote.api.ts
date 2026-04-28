import { FeatureRemoteAPI, PullChangesParams, PushChangesParams } from '@/shared/lib/database/sync'
import { SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync'
import mockCategories from './mock-categories.json'

export const CategoryRemoteAPI: FeatureRemoteAPI = {
  fetchChanges: async ({ lastPulledAt }: PullChangesParams): Promise<SyncDatabaseChangeSet> => {
    console.log('CategoryRemoteAPI: Fetching changes (Pull)...', { lastPulledAt })
    if (!lastPulledAt) {
      const now = Date.now()
      const categories = mockCategories.map((c: any) => ({
        ...c,
        created_at: now,
        updated_at: now,
      }))

      return {
        categories: { created: categories, updated: [], deleted: [] },
      } as any
    }

    return {
      categories: { created: [], updated: [], deleted: [] },
    } as any
  },

  pushChanges: async ({ changes }: PushChangesParams) => {
    const { categories } = changes as any
    console.log('CategoryRemoteAPI: Pushing changes to server...', {
      categoriesCount: categories?.created?.length || 0,
    })
  },
}
