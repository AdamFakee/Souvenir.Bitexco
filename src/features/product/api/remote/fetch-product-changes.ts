import { AxiosService } from '@/shared/lib/axios/axios.service'
import { database, ProductModel } from '@/shared/lib/database'
import type { PullChangesParams, PushChangesParams } from '@/shared/lib/database/sync'
import { storage } from '@/shared/lib/storage'
import type { ProductSyncChanges } from '@/shared/types'
import { Q } from '@nozbe/watermelondb'

/**
 * ProductRaw - Cấu trúc dữ liệu Sản phẩm khớp với SQLite POS Schema (v1.8)
 * (Dùng nội bộ file API cho việc sync SQLite)
 */
export interface ProductRaw {
  id: string
  sku: string
  barcode?: string
  name: string
  name_en?: string | null
  price: number
  tax_rate: number
  stock: number
  unit_id: string
  unit_code: string
  is_active: boolean
  is_deleted: boolean
  created_at?: number
  updated_at?: number
}

// API Functions
export const fetchProductChanges = async ({
  lastPulledAt,
}: PullChangesParams): Promise<ProductSyncChanges> => {
  let warehouseId: string | undefined
  try {
    const rawPersist = storage.getString('app-machine-persist')
    if (rawPersist) {
      const parsed = JSON.parse(rawPersist)
      warehouseId = parsed.device?.warehouseId
    }
  } catch {}
  const axios = AxiosService.getInstance()
  let allItems: any[] = []
  let page = 0
  let hasMore = true
  const limit = 200 // page limit
  let syncedAtFromServer = Date.now()

  try {
    while (hasMore) {
      const response = await axios.get<{
        items: any[]
        hasMore: boolean
        syncedAt: number | string
      }>('/v1/pos/products/sync', {
        params: {
          lastSyncedAt: lastPulledAt
            ? new Date(lastPulledAt).toISOString()
            : new Date(0).toISOString(),
          page,
          limit,
          warehouseId,
        },
      })

      const data = response.data
      if (data && data.items) {
        allItems = allItems.concat(data.items)
        hasMore = data.hasMore
        if (data.syncedAt) {
          syncedAtFromServer =
            typeof data.syncedAt === 'string' ? new Date(data.syncedAt).getTime() : data.syncedAt
        }
      } else {
        hasMore = false
      }
      page++
    }

    // Khử trùng lặp ID sản phẩm nhận được từ Server để tránh sqlite error 1555 (UNIQUE constraint failed: products.id)
    const uniqueItemsMap = new Map<string, any>()
    for (const item of allItems) {
      if (item.id) {
        uniqueItemsMap.set(item.id, item)
      }
    }
    const uniqueItems = Array.from(uniqueItemsMap.values())

    // Lấy danh sách IDs đã tồn tại dưới DB Local để quyết định CREATE hay UPDATE
    const existingIds = new Set<string>()
    if (lastPulledAt && uniqueItems.length > 0) {
      const productIds = uniqueItems.map((item) => item.id).filter(Boolean)
      const chunkSize = 500
      for (let i = 0; i < productIds.length; i += chunkSize) {
        const chunk = productIds.slice(i, i + chunkSize)
        const existingProducts = await database
          .get<ProductModel>('products')
          .query(Q.where('id', Q.oneOf(chunk)))
          .fetch()
        existingProducts.forEach((p) => existingIds.add(p.id))
      }
    }

    const created: ProductRaw[] = []
    const updated: ProductRaw[] = []
    const deleted: string[] = []

    for (const item of uniqueItems) {
      const mapped: ProductRaw = {
        id: item.id,
        sku: item.sku,
        barcode: item.barcode || item.sku,
        name: item.name,
        name_en: item.nameEn || null,
        price: item.price,
        tax_rate: item.taxRate ?? 0,
        stock: item.stock ?? 0,
        unit_id: item.unitId,
        unit_code: item.unitCode || 'CAI',
        is_active: item.isActive ?? true,
        is_deleted: item.isDeleted ?? false,
        created_at: item.createdAt || Date.now(),
        updated_at: item.updatedAt || Date.now(),
      }

      if (item.isDeleted) {
        if (lastPulledAt && existingIds.has(item.id)) {
          deleted.push(item.id)
        }
      } else {
        if (lastPulledAt && existingIds.has(item.id)) {
          updated.push(mapped)
        } else {
          created.push(mapped)
        }
      }
    }

    return {
      products: { created, updated, deleted },
      syncedAt: syncedAtFromServer,
    }
  } catch (error) {
    throw error
  }
}

export const pushProductChanges = async ({ changes }: PushChangesParams) => {
  const { products } = changes as unknown as ProductSyncChanges
  if (!products) return
}
