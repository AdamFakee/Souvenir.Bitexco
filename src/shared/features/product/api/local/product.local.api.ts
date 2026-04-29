import { database, ProductModel } from '@/shared/lib/database'
import { Q } from '@nozbe/watermelondb'

export const ProductLocalAPI = {
  /**
   * Lấy danh sách toàn bộ sản phẩm
   */
  getAllProducts: async (): Promise<ProductModel[]> => {
    return await database.get<ProductModel>('products').query().fetch()
  },

  /**
   * Lấy danh sách sản phẩm có lọc và phân trang
   */
  getProducts: async (params: {
    categoryId?: string | null
    searchQuery?: string
    page?: number
    limit?: number
  }): Promise<ProductModel[]> => {
    const { categoryId, searchQuery, page = 0, limit = 21 } = params // 21 items per page (divisible by 3 columns)
    const clauses: any[] = [Q.where('is_deleted', Q.notEq(true)), Q.where('is_active', true)]

    if (categoryId) {
      clauses.push(Q.where('category_id', categoryId))
    }

    if (searchQuery) {
      clauses.push(
        Q.or(
          Q.where('name', Q.like(`%${Q.sanitizeLikeString(searchQuery)}%`)),
          Q.where('sku', Q.like(`%${Q.sanitizeLikeString(searchQuery)}%`)),
          Q.where('barcode', Q.like(`%${Q.sanitizeLikeString(searchQuery)}%`)),
        ),
      )
    }

    clauses.push(Q.skip(page * limit))
    clauses.push(Q.take(limit))

    return await database
      .get<ProductModel>('products')
      .query(...clauses)
      .fetch()
  },

  /**
   * Tìm sản phẩm bằng mã SKU hoặc Barcode (chính xác 100%)
   */
  getProductByCode: async (code: string): Promise<ProductModel | null> => {
    const products = await database
      .get<ProductModel>('products')
      .query(
        Q.where('is_deleted', Q.notEq(true)),
        Q.where('is_active', true),
        Q.or(Q.where('sku', code), Q.where('barcode', code)),
      )
      .fetch()
    return products.length > 0 ? products[0] : null
  },
}
