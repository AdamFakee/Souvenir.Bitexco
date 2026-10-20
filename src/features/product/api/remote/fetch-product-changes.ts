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
  price_status?: string
  created_at?: number
  updated_at?: number
}

export interface ProductSyncItem {
  id: string
  productId: string
  sku: string
  name: string
  nameEn: string | null
  price: number
  priceStatus?: 'available' | 'no_price'
  taxRate: number
  stock: number
  unitId: string | null
  barcode: string | null
  isActive: boolean
  isDeleted: boolean
  updatedAt: string
  createdAt?: string
  unitCode?: string
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
  let allItems: ProductSyncItem[] = []
  let page = 0
  let hasMore = true
  const limit = 200 // page limit
  let syncedAtFromServer = Date.now()

  try {
    while (hasMore) {
      const response = await axios.get<{
        items: ProductSyncItem[]
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
    const uniqueItemsMap = new Map<string, ProductSyncItem>()
    for (const item of allItems) {
      if (item.id) {
        uniqueItemsMap.set(item.id, item)
      }
    }
    const uniqueItems = Array.from(uniqueItemsMap.values())

    // Lấy danh sách IDs đã tồn tại dưới DB Local để quyết định CREATE hay UPDATE
    // (Bắt buộc kiểm tra để tránh lỗi SQLite Error: UNIQUE constraint failed: products.id ngay cả khi sync lần đầu)
    const existingIds = new Set<string>()
    if (uniqueItems.length > 0) {
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
      const updatedAtMs = item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now()
      const createdAtMs = item.createdAt ? new Date(item.createdAt).getTime() : updatedAtMs

      const mapped: ProductRaw = {
        id: item.id,
        sku: item.sku,
        barcode: item.barcode || item.sku,
        name: item.name,
        name_en: item.nameEn || null,
        price: item.price,
        tax_rate: item.taxRate ?? 0,
        stock: item.stock ?? 0,
        unit_id: item.unitId || '',
        unit_code: item.unitCode || 'CAI',
        is_active: item.isActive ?? true,
        is_deleted: item.isDeleted ?? false,
        price_status: item.priceStatus || 'available',
        created_at: createdAtMs,
        updated_at: updatedAtMs,
      }

      if (item.isDeleted) {
        if (existingIds.has(item.id)) {
          deleted.push(item.id)
        }
      } else {
        if (existingIds.has(item.id)) {
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
