import { database, ProductModel } from '@/shared/lib/database'
import { Q } from '@nozbe/watermelondb'

/**
 * Tìm sản phẩm bằng mã SKU hoặc Barcode (chính xác 100% - Offline Lookup)
 */
export const getProductByCode = async (code: string): Promise<ProductModel | null> => {
  const products = await database
    .get<ProductModel>('products')
    .query(
      Q.where('is_deleted', Q.notEq(true)),
      Q.where('is_active', true),
      Q.or(Q.where('sku', code), Q.where('barcode', code)),
    )
    .fetch()
  return products.length > 0 ? products[0] : null
}
