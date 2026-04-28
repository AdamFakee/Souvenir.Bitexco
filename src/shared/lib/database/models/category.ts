import { Model, Query } from '@nozbe/watermelondb'
import { date, field, readonly, children } from '@nozbe/watermelondb/decorators'
import ProductModel from './product'

export default class CategoryModel extends Model {
  static table = 'categories'
  static associations = {
    products: { type: 'has_many', foreignKey: 'category_id' },
  } as const

  @field('name') name!: string
  @field('color') color?: string
  @field('display_order') displayOrder!: number
  @field('is_deleted') isDeleted!: boolean

  @children('products') products!: Query<ProductModel>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
