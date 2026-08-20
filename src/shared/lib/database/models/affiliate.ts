import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class AffiliateModel extends Model {
  static table = 'affiliates'

  @field('code') code!: string
  @field('name') name!: string
  @field('phone') phone?: string | null
  @field('is_active') isActive!: boolean
  @field('state') state?: string | null
  @readonly @date('updated_at') updatedAt!: Date
}
