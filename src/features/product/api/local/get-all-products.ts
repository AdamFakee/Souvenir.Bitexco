import { database, ProductModel } from '@/shared/lib/database'

/**
 * Lấy danh sách toàn bộ sản phẩm
 */
export const getAllProducts = async (): Promise<ProductModel[]> => {
  return await database.get<ProductModel>('products').query().fetch()
}
