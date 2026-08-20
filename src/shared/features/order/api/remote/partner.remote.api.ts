import { AxiosService } from '@/shared/lib/axios/axios.service'
import { database } from '@/shared/lib/database'
import PartnerModel from '@/shared/lib/database/models/partner'
import { Q } from '@nozbe/watermelondb'

export interface PartnerRaw {
  id: string
  code: string
  name_vi: string
  name_en: string | null
  company_name: string | null
  tax_id: string | null
  address: string | null
  representative: string | null
  representative_title: string | null
  phone: string | null
  email: string | null
  debt_code: string | null
  sap_code: string | null
  invoice_email: string | null
  other_email: string | null
  allow_credit: boolean
  credit_limit: number | null
  remaining_credit: number | null
  is_active: boolean
  version: number
  updated_at: number
}

export interface PartnerSyncChanges {
  partners: {
    created: PartnerRaw[]
    updated: PartnerRaw[]
    deleted: string[]
  }
  syncedAt?: number
}

export const PartnerRemoteAPI = {
  fetchChanges: async ({
    lastPulledAt,
  }: {
    lastPulledAt: number | null
  }): Promise<PartnerSyncChanges> => {
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
        }>('/v1/pos/partners/sync', {
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

          // API might return `hasMore` or we can infer it if items.length < limit
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
        const partnerIds = uniqueItems.map((item) => item.id).filter(Boolean)
        const chunkSize = 500
        for (let i = 0; i < partnerIds.length; i += chunkSize) {
          const chunk = partnerIds.slice(i, i + chunkSize)
          const existingPartners = await database
            .get<PartnerModel>('partners')
            .query(Q.where('id', Q.oneOf(chunk)))
            .fetch()
          existingPartners.forEach((p) => existingIds.add(p.id))
        }
      }

      const created: PartnerRaw[] = []
      const updated: PartnerRaw[] = []
      const deleted: string[] = Array.from(new Set(allDeletedIds)) // Deduplicate deleted IDs

      for (const item of uniqueItems) {
        const mapped: PartnerRaw = {
          id: item.id,
          code: item.code,
          name_vi: item.nameVi || '',
          name_en: item.nameEn || null,
          company_name: item.companyName || null,
          tax_id: item.taxId || null,
          address: item.address || null,
          representative: item.representative || null,
          representative_title: item.representativeTitle || null,
          phone: item.phone || null,
          email: item.email || null,
          debt_code: item.debtCode || null,
          sap_code: item.sapCode || null,
          invoice_email: item.invoiceEmail || null,
          other_email: item.otherEmail || null,
          allow_credit: item.allowCredit ?? false,
          credit_limit: item.creditLimit || null,
          remaining_credit: item.remainingCredit || null,
          is_active: item.isActive ?? true,
          version: item.version ?? 1,
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
        partners: {
          created,
          updated,
          deleted,
        },
        syncedAt: syncedAtFromServer,
      }
    } catch (error) {
      console.error('[PartnerRemoteAPI] Lỗi lấy thay đổi Đối tác:', error)
      return {
        partners: { created: [], updated: [], deleted: [] },
      }
    }
  },
}
