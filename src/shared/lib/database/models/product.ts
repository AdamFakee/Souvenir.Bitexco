import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class ProductModel extends Model {
  static table = 'products'

  @field('sku') sku!: string
  @field('barcode') barcode?: string
  @field('name') name!: string
  @field('price') price!: number
  @field('tax_rate') taxRate!: number
  @field('stock') stock!: number
  @field('unit_id') unitId!: string
  @field('unit_code') unitCode!: string
  @field('is_active') isActive!: boolean
  @field('is_deleted') isDeleted!: boolean

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
