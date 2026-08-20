import { AxiosService } from '@/shared/lib/axios/axios.service'
import { database } from '@/shared/lib/database'
import AffiliateModel from '@/shared/lib/database/models/affiliate'
import { Q } from '@nozbe/watermelondb'

export interface AffiliateRaw {
  id: string
  code: string
  name: string
  phone: string | null
  is_active: boolean
  state: string | null
  updated_at: number
}

export interface AffiliateSyncChanges {
  affiliates: {
    created: AffiliateRaw[]
    updated: AffiliateRaw[]
    deleted: string[]
  }
  syncedAt?: number
}

export const AffiliateRemoteAPI = {
  fetchChanges: async ({
    lastPulledAt,
  }: {
    lastPulledAt: number | null
  }): Promise<AffiliateSyncChanges> => {
    const axios = AxiosService.getInstance()
    let allItems: any[] = []
    let allDeletedIds: string[] = []
    let page = 0
    let hasMore = true
    const limit = 200
    let syncedAtFromServer = Date.now()

    try {
      while (hasMore) {
        const response = await axios.get<{
          items: any[]
          deletedIds?: string[]
          hasMore?: boolean
          syncedAt: number | string
        }>('/v1/pos/affiliates/sync', {
          params: {
            lastSyncedAt: lastPulledAt
              ? new Date(lastPulledAt).toISOString()
              : new Date(0).toISOString(),
            page,
            limit,
          },
        })

        const data = response.data
        if (data && data.items) {
          allItems = allItems.concat(data.items)
          if (data.deletedIds && Array.isArray(data.deletedIds)) {
            allDeletedIds = allDeletedIds.concat(data.deletedIds)
          }

          hasMore = data.hasMore !== undefined ? data.hasMore : data.items.length === limit

          if (data.syncedAt) {
            syncedAtFromServer =
              typeof data.syncedAt === 'string' ? new Date(data.syncedAt).getTime() : data.syncedAt
          }
        } else {
          hasMore = false
        }
        page++
      }

      // Deduplicate items
      const uniqueItemsMap = new Map<string, any>()
      for (const item of allItems) {
        if (item.id) {
          uniqueItemsMap.set(item.id, item)
        }
      }
      const uniqueItems = Array.from(uniqueItemsMap.values())

      // Find existing IDs in local DB
      const existingIds = new Set<string>()
      if (lastPulledAt && uniqueItems.length > 0) {
        const affiliateIds = uniqueItems.map((item) => item.id).filter(Boolean)
        const chunkSize = 500
        for (let i = 0; i < affiliateIds.length; i += chunkSize) {
          const chunk = affiliateIds.slice(i, i + chunkSize)
          const existingAffiliates = await database
            .get<AffiliateModel>('affiliates')
            .query(Q.where('id', Q.oneOf(chunk)))
            .fetch()
          existingAffiliates.forEach((p) => existingIds.add(p.id))
        }
      }

      const created: AffiliateRaw[] = []
      const updated: AffiliateRaw[] = []
      const deleted: string[] = Array.from(new Set(allDeletedIds)) // Deduplicate deleted IDs

      for (const item of uniqueItems) {
        const mapped: AffiliateRaw = {
          id: item.id,
          code: item.code,
          name: item.name || '',
          phone: item.phone || null,
          is_active: item.isActive ?? true,
          state: item.state || null,
          updated_at: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
        }

        if (lastPulledAt) {
          if (existingIds.has(item.id)) {
            updated.push(mapped)
          } else {
            created.push(mapped)
          }
        } else {
          // Full sync -> all are created
          created.push(mapped)
        }
      }

      return {
        affiliates: {
          created,
          updated,
          deleted,
        },
        syncedAt: syncedAtFromServer,
      }
    } catch (error) {
      console.error('[AffiliateRemoteAPI] Lỗi lấy thay đổi CTV:', error)
      return {
        affiliates: { created: [], updated: [], deleted: [] },
      }
    }
  },
}
