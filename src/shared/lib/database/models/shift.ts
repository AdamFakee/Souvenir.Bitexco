import { Model, Relation, Query } from '@nozbe/watermelondb'
import { date, field, readonly, relation, children } from '@nozbe/watermelondb/decorators'
import StaffModel from './staff'
import OrderModel from './order'

export enum ShiftStatus {
  /** Ca làm việc đang mở, cho phép thực hiện giao dịch */
  OPEN = 'OPEN',
  /** Ca đã đóng, đã kiểm đếm và khóa sổ tiền mặt */
  CLOSED = 'CLOSED',
}

export default class ShiftModel extends Model {
  static table = 'shifts'
  static associations = {
    staff: { type: 'belongs_to', key: 'staff_id' },
    orders: { type: 'has_many', foreignKey: 'shift_id' },
  } as const

  @field('staff_id') staffId!: string
  @field('device_id') deviceId!: string
  @field('start_time') startTime!: number
  @field('end_time') endTime?: number
  @field('starting_cash') startingCash!: number
  @field('expected_ending_cash') expectedEndingCash!: number
  @field('actual_ending_cash') actualEndingCash?: number
  @field('difference_cash') differenceCash?: number
  @field('discrepancy_reason') discrepancyReason?: string
  /** Tổng doanh thu thu bằng Tiền mặt trong ca (cộng dồn sau mỗi đơn offline) */
  @field('cash_revenue') cashRevenue!: number
  /** Tổng doanh thu thu bằng QR/Chuyển khoản trong ca (cộng dồn sau mỗi đơn online) */
  @field('qr_revenue') qrRevenue!: number
  /** Tổng số đơn hàng đã bán trong ca */
  @field('total_orders') totalOrders!: number
  @field('status') status!: ShiftStatus
  @field('is_deleted') isDeleted!: boolean

  @relation('staff', 'staff_id') staff!: Relation<StaffModel>
  @children('orders') orders!: Query<OrderModel>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
