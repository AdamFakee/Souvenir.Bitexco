import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class StaffModel extends Model {
  static table = 'staff'

  @field('full_name') fullName!: string
  @field('role') role!: string
  @field('pin_hash') pinHash!: string
  @field('is_active') isActive!: boolean
  @field('outlet_id') outletId!: string
  @field('is_deleted') isDeleted!: boolean

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
