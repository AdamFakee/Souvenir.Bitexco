import { PaymentLocalAPI } from '@/shared/features/payment/api/local'
import type { CartItem } from '@/shared/features/pos/store/use-cart-store'
import { ProductLocalAPI } from '@/shared/features/product/api/local/product.local.api'
import { ShiftLocalAPI } from '@/shared/features/shift/api/local'
import { database, OrderItemModel, OrderModel } from '@/shared/lib/database'
import { OrderStatus } from '@/shared/lib/database/models/order'
import { PaymentMethod } from '@/shared/lib/database/models/payment'
import { ItemSnapshot, PaymentSnapshot } from '@/shared/lib/database/types'

export interface CheckoutPaymentPayload {
  method: PaymentMethod
  amount: number
  cashTendered?: number
  cashChange?: number
  referenceCode?: string
}

export interface CheckoutPayload {
  staffId: string
  shiftId: string
  items: CartItem[]
  subtotal: number
  discount: number
  voucherCode?: string
  voucherDiscount: number
  total: number
  payment: CheckoutPaymentPayload
}

export const OrderLocalAPI = {
  /**
   * Thanh toán chung (Tiền mặt, Chuyển khoản, Card...).
   * Orchestrate việc tạo order, payment và trừ stock trong 1 batch transaction.
   */
  checkout: async (payload: CheckoutPayload): Promise<void> => {
    // 1. Lấy shift từ shiftId có sẵn trong payload
    const shift = await ShiftLocalAPI.getShiftById(payload.shiftId)

    // Xây snapshot items
    const itemsSnapshot: ItemSnapshot[] = payload.items.map((i) => ({
      productId: i.product.id,
      sku: i.product.sku,
      barcode: i.product.barcode ?? undefined,
      name: i.product.name,
      price: i.product.price,
      quantity: i.quantity,
      subtotal: i.product.price * i.quantity,
    }))

    // Xây snapshot payments
    const paymentsSnapshot: PaymentSnapshot[] = [
      {
        method: payload.payment.method,
        amount: payload.payment.amount,
      },
    ]

    // 2. Prepare Order
    const preparedOrder = database.get<OrderModel>('orders').prepareCreate((o) => {
      o.shiftId = shift.id
      o.staffId = payload.staffId
      o.status = OrderStatus.COMPLETED
      o.subtotal = payload.subtotal
      o.discount = payload.discount
      o.voucherCode = payload.voucherCode
      o.voucherDiscount = payload.voucherDiscount
      o.total = payload.total
      o.itemsSnapshot = itemsSnapshot
      o.paymentsSnapshot = paymentsSnapshot
      o.isDeleted = false
    })

    // 3. Prepare OrderItems
    const preparedItems = payload.items.map((item) =>
      database.get<OrderItemModel>('order_items').prepareCreate((oi) => {
        oi.orderId = preparedOrder.id
        oi.productId = item.product.id
        oi.productNameSnapshot = item.product.name
        oi.priceSnapshot = item.product.price
        oi.quantity = item.quantity
        oi.refundedQuantity = 0
        oi.subtotal = item.product.price * item.quantity
        oi.isDeleted = false
      }),
    )

    // 4. Prepare Payment
    const preparedPayment = PaymentLocalAPI.prepareCreatePayment(preparedOrder.id, {
      method: payload.payment.method,
      amount: payload.payment.amount,
      cashTendered: payload.payment.cashTendered,
      cashChange: payload.payment.cashChange,
      referenceCode: payload.payment.referenceCode,
    })

    // 5. Prepare Stock Updates
    const preparedStockUpdates = await ProductLocalAPI.prepareDeductStock(payload.items)

    // 6. Prepare Shift Update
    const preparedShiftUpdate = ShiftLocalAPI.prepareUpdateStats(shift, {
      cashAmount: payload.payment.method === PaymentMethod.CASH ? payload.total : 0,
      qrAmount: payload.payment.method === PaymentMethod.BANK_TRANSFER ? payload.total : 0,
      incrementOrderCount: true,
    })

    // 7. Batch tất cả (phải được bọc trong writer)
    await database.write(async () => {
      await database.batch(
        preparedOrder,
        ...preparedItems,
        preparedPayment,
        ...preparedStockUpdates,
        preparedShiftUpdate,
      )
    })
  },

  /**
   * Chỉ ghi nhận doanh thu và trừ tồn kho (dùng cho Online Payment đã lưu trên Backend).
   * Không lưu Order, OrderItems và Payment vào Local DB.
   */
  recordOnlineOrderSuccess: async (payload: CheckoutPayload): Promise<void> => {
    // 1. Lấy shift từ shiftId có sẵn trong payload
    const shift = await ShiftLocalAPI.getShiftById(payload.shiftId)

    // 2. Prepare Stock Updates
    const preparedStockUpdates = await ProductLocalAPI.prepareDeductStock(payload.items)

    // 3. Prepare Shift Update
    const preparedShiftUpdate = ShiftLocalAPI.prepareUpdateStats(shift, {
      qrAmount: payload.total,
      incrementOrderCount: true,
    })

    // 4. Batch cập nhật (không có preparedOrder)
    await database.write(async () => {
      await database.batch(...preparedStockUpdates, preparedShiftUpdate)
    })
  },
}
