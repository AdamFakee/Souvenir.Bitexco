import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export default class CategoryModel extends Model {
  static table = 'categories'

  @field('name') name!: string
  @field('display_order') displayOrder!: number
  @field('is_deleted') isDeleted!: boolean

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
