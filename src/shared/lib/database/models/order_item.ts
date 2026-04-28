import { Model, Relation } from '@nozbe/watermelondb'
import { date, field, readonly, relation } from '@nozbe/watermelondb/decorators'
import OrderModel from './order'
import ProductModel from './product'

export default class OrderItemModel extends Model {
  static table = 'order_items'
  static associations = {
    orders: { type: 'belongs_to', key: 'order_id' },
    products: { type: 'belongs_to', key: 'product_id' },
  } as const

  @field('order_id') orderId!: string
  @field('product_id') productId!: string
  @field('product_name_snapshot') productNameSnapshot!: string
  @field('price_snapshot') priceSnapshot!: number
  @field('quantity') quantity!: number
  @field('refunded_quantity') refundedQuantity!: number
  @field('subtotal') subtotal!: number
  @field('is_deleted') isDeleted!: boolean

  @relation('orders', 'order_id') order!: Relation<OrderModel>
  @relation('products', 'product_id') product!: Relation<ProductModel>

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
