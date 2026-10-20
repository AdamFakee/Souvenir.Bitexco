/**
 * PosLookupRawResult - Cấu trúc dữ liệu thô trả về trực tiếp từ Backend API (PosCashierModels.cs)
 * Dùng cho cả 2 API: GET /v1/pos/search và GET /v1/pos/lookup
 */
export interface PosLookupRawResult {
  /** ID của biến thể sản phẩm (dùng để add vào giỏ hàng) */
  variantId: string // UUID
  /** ID của sản phẩm cha */
  productId: string // UUID
  /** Mã SKU sản phẩm / biến thể */
  sku: string
  /** Tên sản phẩm cha */
  productName: string
  /** Tên biến thể */
  variantName: string
  /** Tên tiếng Anh / tên chuẩn hóa in bill (null nếu chưa nhập) */
  productNameEn: string | null
  /** ID đơn vị tính cơ bản */
  unitId: string // UUID
  /** Mã đơn vị tính (ví dụ: "PCS", "HOP", "CAI") */
  unitCode: string
  /** Giá bán lẻ (null nếu sản phẩm chưa có giá) */
  price: number | null
  /** Trạng thái giá: 'available' (đã có giá bán) | 'no_price' (chưa có giá) | 'inactive' */
  priceStatus: 'available' | 'no_price' | 'inactive'
  /** Tổng tồn thực tế tại kho (on_hand) */
  onHand: number
  /** Số lượng đang giữ chỗ/đặt trước (reserved) */
  reserved: number
  /** Tồn khả dụng có thể bán (available = onHand - reserved) */
  available: number
  /** Có quản lý theo Lô / Hạn sử dụng hay không */
  trackBatches: boolean
  /** Có quản lý theo Serial number hay không */
  trackSerials: boolean
  /** Mã vạch (trả về mã vừa quét nếu gọi qua lookup barcode) */
  barcode: string | null
  /** Thuế suất VAT (%) */
  taxRate: number
  /** Sản phẩm đang kích hoạt bán hay không */
  isActive: boolean
}

/**
 * PosLookupResult - Kết quả tra cứu/tìm kiếm sản phẩm đã chuẩn hóa an toàn cho Client POS
 * (Đảm bảo price luôn là number, barcode luôn là string)
 */
export interface PosLookupResult extends Omit<PosLookupRawResult, 'price' | 'barcode'> {
  price: number
  barcode: string
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
