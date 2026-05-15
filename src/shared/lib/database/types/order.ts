/**
 * Dữ liệu Snapshot lưu trữ thông tin sản phẩm trong giỏ hàng lúc thanh toán
 */
export interface ItemSnapshot {
  /** ID của sản phẩm */
  productId: string
  /** Mã SKU/Barcode */
  sku: string
  /** Mã Barcode */
  barcode?: string
  /** Tên sản phẩm */
  name: string
  /** Giá bán tại thời điểm thanh toán */
  price: number
  /** Số lượng mua */
  quantity: number
  /** Thành tiền (price * quantity) */
  subtotal: number
  /** Mức thuế tại thời điểm thanh toán */
  taxRate: number
  /** Tiền thuế tính được */
  taxAmount: number
  /** Tiền giảm giá riêng cho món */
  discountAmount: number
  /** Ghi chú món ăn */
  note?: string
}

/**
 * Chuẩn hóa dữ liệu danh sách sản phẩm Snapshot
 */
export const sanitizeItemsSnapshot = (rawItems: any): ItemSnapshot[] => {
  if (!Array.isArray(rawItems)) return []
  return rawItems.map((item: any) => ({
    productId: String(item.productId || item.product_id || ''),
    sku: String(item.sku || ''),
    barcode: item.barcode ? String(item.barcode) : undefined,
    name: String(item.name || ''),
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 0),
    subtotal: Number(item.subtotal || 0),
    taxRate: Number(item.taxRate || item.tax_rate || 0),
    taxAmount: Number(item.taxAmount || item.tax_amount || 0),
    discountAmount: Number(item.discountAmount || item.discount_amount || 0),
    note: item.note ? String(item.note) : undefined,
  }))
}
