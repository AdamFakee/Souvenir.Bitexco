import { AxiosService } from '@/shared/lib/axios/axios.service'
import { database, ProductModel } from '@/shared/lib/database'
import { FeatureRemoteAPI, PullChangesParams, PushChangesParams } from '@/shared/lib/database/sync'
import { storage } from '@/shared/lib/storage'
import { Q } from '@nozbe/watermelondb'

/**
 * ProductRaw - Cấu trúc dữ liệu Sản phẩm khớp với SQLite POS Schema (v1.8)
 */
export interface ProductRaw {
  id: string
  sku: string
  barcode?: string
  name: string
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

/**
 * PosLookupResult - Cấu trúc kết quả tra cứu/tìm kiếm sản phẩm chuẩn API v1.8
 */
export interface PosLookupResult {
  variantId: string
  productId: string
  sku: string
  productName: string
  variantName: string
  unitId: string
  unitCode: string
  price: number
  onHand: number
  reserved: number
  available: number
  trackBatches: boolean
  trackSerials: boolean
  barcode: string
  taxRate: number
  isActive: boolean
}

/**
 * ProductSyncChanges - Cấu trúc các thay đổi của Sản phẩm để sync offline
 */
export interface ProductSyncChanges {
  products: {
    created: ProductRaw[]
    updated: ProductRaw[]
    deleted: string[]
  }
  syncedAt?: number
}

export const ProductRemoteAPI: FeatureRemoteAPI & {
  lookupProduct: (params: {
    barcode?: string
    sku?: string
    warehouseId?: string
  }) => Promise<PosLookupResult | null>
  searchProducts: (params: {
    q: string
    warehouseId?: string
    limit?: number
  }) => Promise<PosLookupResult[]>
  /** SP cùng category với sku(s) món trả — multi sku + page */
  listCategoryBySku: (params: {
    skus: string[]
    warehouseId?: string
    page?: number
    limit?: number
  }) => Promise<{ items: PosLookupResult[]; page: number; limit: number; hasMore: boolean }>
} = {
  /**
   * 4.1 Tra cứu chính xác theo barcode hoặc SKU trực tuyến
   */
  lookupProduct: async (params: {
    barcode?: string
    sku?: string
    warehouseId?: string
  }): Promise<PosLookupResult | null> => {
    const axios = AxiosService.getInstance()

    const queryParams: Record<string, string> = {}
    if (params.barcode) queryParams.barcode = params.barcode
    if (params.sku) queryParams.sku = params.sku
    if (params.warehouseId) queryParams.warehouseId = params.warehouseId

    try {
      const response = await axios.get<PosLookupResult>('/v1/pos/lookup', {
        params: queryParams,
      })
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  /**
   * 4.2 Tìm kiếm theo từ khoá tương đối trực tuyến
   */
  searchProducts: async (params: {
    q: string
    warehouseId?: string
    limit?: number
  }): Promise<PosLookupResult[]> => {
    const axios = AxiosService.getInstance()

    const response = await axios.get<PosLookupResult[]>('/v1/pos/search', {
      params: {
        q: params.q,
        warehouseId: params.warehouseId,
        limit: params.limit || 25,
      },
    })
    return response.data
  },

  /**
   * SP cùng category theo sku món trả (đổi hàng).
   * Multi sku: sku=A&sku=B. Response: { items, page, limit, hasMore } — không total.
   */
  listCategoryBySku: async (params: {
    skus: string[]
    warehouseId?: string
    page?: number
    limit?: number
  }): Promise<{ items: PosLookupResult[]; page: number; limit: number; hasMore: boolean }> => {
    const axios = AxiosService.getInstance()
    const skus = params.skus.map((s) => s.trim()).filter(Boolean)
    const page = params.page && params.page > 0 ? params.page : 1
    const limit = params.limit || 40

    if (skus.length === 0) {
      return { items: [], page, limit, hasMore: false }
    }

    const response = await axios.get<{
      items?: PosLookupResult[]
      page?: number
      limit?: number
      hasMore?: boolean
    }>('/v1/pos/category', {
      params: {
        sku: skus,
        warehouseId: params.warehouseId,
        page,
        limit,
      },
      paramsSerializer: {
        // sku=A&sku=B (repeat)
        indexes: null,
      } as any,
    })

    const data = response.data ?? {}
    const items = Array.isArray(data.items) ? data.items : []

    return {
      items,
      page: data.page ?? page,
      limit: data.limit ?? limit,
      hasMore: typeof data.hasMore === 'boolean' ? data.hasMore : false,
    }
  },

  /**
   * 4.3 Tải danh mục sản phẩm (sync warmup)
   * Gọi API GET /v1/pos/products/sync phân trang và chuyển đổi sang Schema WatermelonDB.
   */
  fetchChanges: async ({ lastPulledAt }: PullChangesParams): Promise<ProductSyncChanges> => {
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
          console.log(`[ProductRemoteAPI] Phản hồi trang ${page}:`, {
            itemsCount: data?.items?.length ?? 0,
            hasMore: data?.hasMore,
            syncedAt: data?.syncedAt,
          })
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
  },

  pushChanges: async ({ changes }: PushChangesParams) => {
    const { products } = changes as unknown as ProductSyncChanges
    if (!products) return

    const { created, updated, deleted } = products
  },
}
