import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class ProductModel extends Model {
  static table = 'products'

  @field('name') name!: string
  @field('price') price!: number
  @field('sku') sku?: string
  @field('image_url') imageUrl?: string

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
