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
      const sanitized = Q.sanitizeLikeString(searchQuery)
      clauses.push(
        Q.or(
          Q.where('name_en', Q.like(`%${sanitized}%`)),
          Q.where('name_vi', Q.like(`%${sanitized}%`)),
          Q.where('sku', Q.like(`%${sanitized}%`)),
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
      .query(Q.where('is_deleted', Q.notEq(true)), Q.where('is_active', true), Q.where('sku', code))
      .fetch()
    return products.length > 0 ? products[0] : null
  },

  /**
   * Trừ tồn kho sản phẩm.
   */
  prepareDeductStock: async (
    items: { product: { id: string }; quantity: number }[],
  ): Promise<ProductModel[]> => {
    if (items.length === 0) return []

    const productIds = items.map((i) => i.product.id)
    const products = await database
      .get<ProductModel>('products')
      .query(Q.where('id', Q.oneOf(productIds)))
      .fetch()

    return products.map((product) => {
      const cartItem = items.find((i) => i.product.id === product.id)
      if (!cartItem) return product

      return product.prepareUpdate((p) => {
        if (p.stock !== null && p.stock !== undefined) {
          p.stock = Math.max(0, p.stock - cartItem.quantity)
        }
      })
    })
  },
}
