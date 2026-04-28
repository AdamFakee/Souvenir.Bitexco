import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class OrderModel extends Model {
  static table = 'orders'

  @field('total_amount') totalAmount!: number
  @field('status') status!: string

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
