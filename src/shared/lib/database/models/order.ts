import { Model } from '@nozbe/watermelondb'
import { date, field, json, readonly } from '@nozbe/watermelondb/decorators'
import {
  ItemSnapshot,
  PaymentSnapshot,
  TaxInfo,
  sanitizeItemsSnapshot,
  sanitizePaymentsSnapshot,
  sanitizeTaxInfo,
} from '../types'

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
  @field('is_synced') isSynced!: boolean

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
