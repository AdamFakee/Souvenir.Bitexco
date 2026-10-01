import { database, ProductModel } from '@/shared/lib/database'
import { Q } from '@nozbe/watermelondb'

export interface GetLocalProductsParams {
  searchQuery?: string
  page?: number
  limit?: number
}

/**
 * Lấy danh sách sản phẩm có lọc và phân trang (Tìm kiếm offline)
 */
export const getProducts = async (params: GetLocalProductsParams): Promise<ProductModel[]> => {
  const { searchQuery, page = 0, limit = 21 } = params
  const clauses: any[] = [Q.where('is_deleted', Q.notEq(true)), Q.where('is_active', true)]

  if (searchQuery) {
    const sanitized = Q.sanitizeLikeString(searchQuery)
    clauses.push(
      Q.or(
        Q.where('name', Q.like(`%${sanitized}%`)),
        Q.where('name_en', Q.like(`%${sanitized}%`)),
        Q.where('sku', Q.like(`%${sanitized}%`)),
        Q.where('barcode', Q.like(`%${sanitized}%`)),
      ),
    )
  }

  clauses.push(Q.skip(page * limit))
  clauses.push(Q.take(limit))

  return await database
    .get<ProductModel>('products')
    .query(...clauses)
    .fetch()
}
