import { Model, Relation } from '@nozbe/watermelondb'
import { date, field, readonly, relation } from '@nozbe/watermelondb/decorators'
import OrderModel from './order'

export enum PaymentMethod {
  /** Thanh toán bằng Tiền mặt */
  CASH = 'CASH',
  /** Thanh toán bằng thẻ (POS quẹt thẻ) */
  CARD = 'CARD',
  /** Chuyển khoản ngân hàng (Quét mã QR) */
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export default class PaymentModel extends Model {
  static table = 'payments'
  static associations = {
    orders: { type: 'belongs_to', key: 'order_id' },
  } as const

  @field('order_id') orderId!: string
  @field('method') method!: PaymentMethod
  @field('amount') amount!: number
  @field('cash_tendered') cashTendered?: number
  @field('cash_change') cashChange?: number
  @field('reference_code') referenceCode?: string
  @field('card_type') cardType?: string
  @field('is_deleted') isDeleted!: boolean

  @relation('orders', 'order_id') order!: Relation<OrderModel>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
