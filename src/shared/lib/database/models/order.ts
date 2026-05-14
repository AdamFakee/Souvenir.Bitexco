import { Model, Query, Relation } from '@nozbe/watermelondb'
import { children, date, field, json, readonly, relation } from '@nozbe/watermelondb/decorators'
import {
  ItemSnapshot,
  PaymentSnapshot,
  TaxInfo,
  sanitizeItemsSnapshot,
  sanitizePaymentsSnapshot,
  sanitizeTaxInfo,
} from '../types'
import OrderItemModel from './order_item'
import PaymentModel from './payment'
import ShiftModel from './shift'
import StaffModel from './staff'

export enum OrderStatus {
  /** Đơn hàng đang chờ thanh toán/xử lý */
  PENDING = 'PENDING',
  /** Đơn hàng bán mới thành công (Doanh thu Dương) */
  COMPLETED = 'COMPLETED',
  /** Đơn hàng đổi trả/hoàn tiền (Bút toán Doanh thu Âm) */
  REFUNDED = 'REFUNDED',
  /** Đơn hàng thất bại hoặc bị hủy */
  FAILED = 'FAILED',
}

export default class OrderModel extends Model {
  static table = 'orders'
  static associations = {
    shifts: { type: 'belongs_to', key: 'shift_id' },
    staff: { type: 'belongs_to', key: 'staff_id' },
    order_items: { type: 'has_many', foreignKey: 'order_id' },
    payments: { type: 'has_many', foreignKey: 'order_id' },
  } as const

  @field('shift_id') shiftId!: string
  @field('staff_id') staffId!: string
  @field('status') status!: OrderStatus
  @field('subtotal') subtotal!: number
  @field('discount') discount!: number
  @field('voucher_code') voucherCode?: string
  @field('voucher_discount') voucherDiscount!: number
  @field('total') total!: number
  @field('total_tax') totalTax!: number
  @field('note') note?: string
  @field('refund_reason') refundReason?: string
  @field('original_order_id') originalOrderId?: string
  @json('customer_tax_info', sanitizeTaxInfo) customerTaxInfo!: TaxInfo | null
  @json('items_snapshot', sanitizeItemsSnapshot) itemsSnapshot!: ItemSnapshot[]
  @json('payments_snapshot', sanitizePaymentsSnapshot) paymentsSnapshot!: PaymentSnapshot[]
  @field('is_deleted') isDeleted!: boolean

  @relation('shifts', 'shift_id') shift!: Relation<ShiftModel>
  @relation('staff', 'staff_id') staff!: Relation<StaffModel>
  @children('order_items') orderItems!: Query<OrderItemModel>
  @children('payments') payments!: Query<PaymentModel>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
