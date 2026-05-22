import { AxiosService } from '@/shared/lib/axios/axios.service'
import { FeatureRemoteAPI, PullChangesParams, PushChangesParams } from '@/shared/lib/database/sync'
import mockProducts from './mock-products.json'

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
} = {
  /**
   * 4.1 Tra cứu chính xác theo barcode hoặc SKU trực tuyến
   */
  lookupProduct: async (params: {
    barcode?: string
    sku?: string
    warehouseId?: string
  }): Promise<PosLookupResult | null> => {
    console.log('[ProductRemoteAPI] Online Lookup:', params)
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
    console.log('[ProductRemoteAPI] Online Search:', params)
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
   * 4.3 Tải danh mục sản phẩm (sync warmup)
   * Translation Engine dịch dữ liệu API v1.8 sang cấu trúc SQLite POS gọn nhẹ
   */
  fetchChanges: async ({ lastPulledAt }: PullChangesParams): Promise<ProductSyncChanges> => {
    console.log('ProductRemoteAPI: Fetching changes (Pull)...', { lastPulledAt })

    if (!lastPulledAt) {
      const now = Date.now()
      const products: ProductRaw[] = (mockProducts as any[]).map((p) => ({
        id: p.id,
        sku: p.sku,
        barcode: p.barcodes?.[0] || p.sku,
        name: p.name,
        price: p.price,
        tax_rate: 8,
        stock: p.stock,
        unit_id: p.unitId,
        unit_code: p.unitCode || 'CAI',
        is_active: true,
        is_deleted: false,
        created_at: now,
        updated_at: now,
      }))

      return {
        products: { created: products, updated: [], deleted: [] },
      }
    }

    return {
      products: { created: [], updated: [], deleted: [] },
    }
  },

  pushChanges: async ({ changes }: PushChangesParams) => {
    const { products } = changes as unknown as ProductSyncChanges
    if (!products) return

    const { created, updated, deleted } = products
    console.log('ProductRemoteAPI: Pushing changes to server...', {
      createdCount: created.length,
      updatedCount: updated.length,
      deletedCount: deleted.length,
    })
  },
}
