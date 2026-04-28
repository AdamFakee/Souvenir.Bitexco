import { Model, Query } from '@nozbe/watermelondb'
import { children, date, field, readonly } from '@nozbe/watermelondb/decorators'
import OrderModel from './order'
import ShiftModel from './shift'

export enum StaffRole {
  /** Quản trị viên hệ thống (Toàn quyền) */
  ADMIN = 'ADMIN',
  /** Quản lý cửa hàng (Xem báo cáo lãi gộp, quản lý kho) */
  MANAGER = 'MANAGER',
  /** Thu ngân (Chỉ thao tác bán hàng/mở ca/đóng ca) */
  CASHIER = 'CASHIER',
}

export default class StaffModel extends Model {
  static table = 'staff'
  static associations = {
    shifts: { type: 'has_many', foreignKey: 'staff_id' },
    orders: { type: 'has_many', foreignKey: 'staff_id' },
  } as const

  @field('username') username!: string
  @field('fullname') fullname!: string
  @field('role') role!: StaffRole
  @field('password') password!: string
  @field('is_active') isActive!: boolean
  @field('is_deleted') isDeleted!: boolean

  @children('shifts') shifts!: Query<ShiftModel>
  @children('orders') orders!: Query<OrderModel>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
