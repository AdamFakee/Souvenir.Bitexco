import { database, ProductModel } from '@/shared/lib/database'
import { Q } from '@nozbe/watermelondb'

export interface GetLocalProductsParams {
  searchQuery?: string
  page?: number
  limit?: number
}

export const escapeLike = (str: string) => str.replace(/[%_\\]/g, '\\$&')

/**
 * Lấy danh sách sản phẩm có lọc và phân trang (Tìm kiếm offline)
 * Áp dụng thứ tự ưu tiên tìm kiếm theo chuẩn Note 22:
 *  - Ưu tiên 1: Tên, Tên tiếng Anh, SKU, Barcode BẮT ĐẦU bằng từ khóa (prefix match)
 *  - Ưu tiên 2: Có một từ trong tên/tên tiếng Anh bắt đầu bằng từ khóa (word prefix match)
 *  - Ưu tiên 3: Chứa từ khóa ở các vị trí khác (substring match)
 *  - Deterministic sort: match_priority ASC, name ASC, id ASC
 */
export const getProducts = async (params: GetLocalProductsParams): Promise<ProductModel[]> => {
  const { searchQuery, page = 0, limit = 21 } = params
  const trimmed = searchQuery?.trim().replace(/\s+/g, ' ')

  // Khi không có từ khóa tìm kiếm: trả về danh sách sắp xếp cố định theo ngày tạo
  if (!trimmed) {
    return await database
      .get<ProductModel>('products')
      .query(
        Q.where('is_deleted', Q.notEq(true)),
        Q.where('is_active', true),
        Q.sortBy('created_at', Q.desc),
        Q.sortBy('id', Q.asc),
        Q.skip(page * limit),
        Q.take(limit),
      )
      .fetch()
  }

  const escaped = escapeLike(trimmed)
  const substringPattern = `%${escaped}%`
  const prefixPattern = `${escaped}%`
  const wordPrefixPattern = `% ${escaped}%`

  const sql = `
    SELECT "products".* FROM "products"
    WHERE "products"."is_deleted" is not 1 AND "products"."is_active" is 1
      AND (
        "products"."name" LIKE ? ESCAPE '\\' OR
        "products"."name_en" LIKE ? ESCAPE '\\' OR
        "products"."sku" LIKE ? ESCAPE '\\' OR
        "products"."barcode" LIKE ? ESCAPE '\\'
      )
    ORDER BY
      CASE
        -- Ưu tiên 1 (Cao nhất): Tên, SKU hoặc Barcode bắt đầu bằng từ khóa tìm kiếm
        WHEN "products"."name" LIKE ? ESCAPE '\\'
          OR "products"."name_en" LIKE ? ESCAPE '\\'
          OR "products"."sku" LIKE ? ESCAPE '\\'
          OR "products"."barcode" LIKE ? ESCAPE '\\'
        THEN 1
        -- Ưu tiên 2: Có một từ trong tên bắt đầu bằng từ khóa
        WHEN "products"."name" LIKE ? ESCAPE '\\'
          OR "products"."name_en" LIKE ? ESCAPE '\\'
        THEN 2
        -- Ưu tiên 3: Chứa từ khóa ở các vị trí khác (substring match)
        ELSE 3
      END ASC,
      "products"."name" ASC,
      "products"."id" ASC
    LIMIT ? OFFSET ?
  `

  const values = [
    // WHERE conditions
    substringPattern,
    substringPattern,
    substringPattern,
    substringPattern,
    // Ưu tiên 1
    prefixPattern,
    prefixPattern,
    prefixPattern,
    prefixPattern,
    // Ưu tiên 2
    wordPrefixPattern,
    wordPrefixPattern,
    // Phân trang
    limit,
    page * limit,
  ]

  try {
    return await database.get<ProductModel>('products').query(Q.unsafeSqlQuery(sql, values)).fetch()
  } catch (err) {
    console.error('getProducts unsafeSqlQuery failed, falling back to standard query:', err)
    const sanitized = Q.sanitizeLikeString(trimmed)
    return await database
      .get<ProductModel>('products')
      .query(
        Q.where('is_deleted', Q.notEq(true)),
        Q.where('is_active', true),
        Q.or(
          Q.where('name', Q.like(`%${sanitized}%`)),
          Q.where('name_en', Q.like(`%${sanitized}%`)),
          Q.where('sku', Q.like(`%${sanitized}%`)),
          Q.where('barcode', Q.like(`%${sanitized}%`)),
        ),
        Q.skip(page * limit),
        Q.take(limit),
      )
      .fetch()
  }
}
