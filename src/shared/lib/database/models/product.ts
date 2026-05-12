import { Model, Relation } from '@nozbe/watermelondb'
import { date, field, readonly, relation } from '@nozbe/watermelondb/decorators'
import CategoryModel from './category'

export default class ProductModel extends Model {
  static table = 'products'
  static associations = {
    categories: { type: 'belongs_to', key: 'category_id' },
  } as const

  @field('category_id') categoryId!: string
  @field('sku') sku!: string
  @field('name_en') nameEn!: string
  @field('name_vi') nameVi!: string
  @field('unit') unit!: string
  @field('price') price!: number
  @field('tax_rate') taxRate!: number
  @field('cost_price') costPrice!: number
  @field('stock') stock!: number
  @field('image') image?: string
  @field('supplier') supplier!: string
  @field('is_active') isActive!: boolean
  @field('is_deleted') isDeleted!: boolean

  @relation('categories', 'category_id') category!: Relation<CategoryModel>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
