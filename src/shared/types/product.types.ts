/**
 * PosLookupResult - Cấu trúc kết quả tra cứu/tìm kiếm sản phẩm chuẩn API v1.8 (dùng chung giữa các features)
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
  productNameEn?: string | null
  variantNameEn?: string | null
}

/**
 * ProductSyncChanges - Cấu trúc các thay đổi của Sản phẩm để sync offline
 */
export interface ProductSyncChanges {
  products: {
    created: any[]
    updated: any[]
    deleted: string[]
  }
  syncedAt?: number
}
