import { database, CategoryModel } from '@/shared/lib/database'

export const CategoryLocalAPI = {
  /**
   * Lấy danh sách toàn bộ danh mục sản phẩm
   */
  getAllCategories: async (): Promise<CategoryModel[]> => {
    return await database.get<CategoryModel>('categories').query().fetch()
  },
}
