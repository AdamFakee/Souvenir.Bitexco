import { PaymentLocalAPI } from '@/shared/features/payment/api/local/payment.local.api'
import type { CartItem } from '@/shared/features/pos/store/use-cart-store'
import { ProductLocalAPI } from '@/shared/features/product/api/local/product.local.api'
import { ShiftLocalAPI } from '@/shared/features/shift/api/local/shift.local.api'
import {
  database,
  OrderItemModel,
  OrderModel,
  OrderStatus,
  PaymentMethod,
  PaymentModel,
  type ItemSnapshot,
  type PaymentSnapshot,
} from '@/shared/lib/database'
import type { OrderSyncDataResponse } from '@/shared/features/payment/api/remote/payment.remote.api'
import { endOfDay, startOfDay } from '@/shared/utils'
import { Q } from '@nozbe/watermelondb'

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
  note?: string
  payment: CheckoutPaymentPayload
}

export interface GetOrdersParams {
  status?: OrderStatus | null
  searchQuery?: string
  dateFrom?: Date | null
  dateTo?: Date | null
  limit?: number
  offset?: number
}

export const OrderLocalAPI = {
  /**
   * Lấy danh sách đơn hàng từ Local Database (WatermelonDB).
   * Hỗ trợ tìm kiếm theo ID/Sản phẩm, lọc theo trạng thái và khoảng ngày.
   *
   * @param params - Các tham số lọc: status, searchQuery, dateFrom, dateTo, limit, offset
   * @returns Danh sách OrderModel tương ứng
   */
  getOrders: async (params: GetOrdersParams): Promise<OrderModel[]> => {
    const { status, searchQuery, dateFrom, dateTo, limit = 50, offset = 0 } = params
    const clauses: any[] = [Q.where('is_deleted', Q.notEq(true))]

    if (status) {
      clauses.push(Q.where('status', status))
    }

    if (searchQuery) {
      const sanitized = Q.sanitizeLikeString(searchQuery.trim())
      clauses.push(
        Q.or(
          Q.where('id', Q.like(`%${sanitized}%`)),
          Q.where('items_snapshot', Q.like(`%${sanitized}%`)),
        ),
      )
    }

    if (dateFrom) {
      clauses.push(Q.where('created_at', Q.gte(startOfDay(dateFrom).getTime())))
    }

    if (dateTo) {
      clauses.push(Q.where('created_at', Q.lte(endOfDay(dateTo).getTime())))
    }

    clauses.push(Q.sortBy('created_at', Q.desc))
    clauses.push(Q.skip(offset))
    clauses.push(Q.take(limit))

    return await database
      .get<OrderModel>('orders')
      .query(...clauses)
      .fetch()
  },

  /**
   * Lấy chi tiết đơn hàng
   */
  getOrderById: async (id: string): Promise<OrderModel | null> => {
    try {
      return await database.get<OrderModel>('orders').find(id)
    } catch {
      return null
    }
  },

  /**
   * Cập nhật trạng thái đơn hàng (ví dụ: FAIL, REFUNDED)
   */
  updateOrderStatus: async (orderId: string, status: OrderStatus): Promise<void> => {
    const order = await database.get<OrderModel>('orders').find(orderId)
    await database.write(async () => {
      await order.update((o) => {
        o.status = status
      })
    })
  },

  /**
   * Thanh toán chung (Tiền mặt, Chuyển khoản, Card...).
   * Orchestrate việc tạo order, payment và trừ stock trong 1 batch transaction.
   */
  checkout: async (payload: CheckoutPayload): Promise<void> => {
    // 1. Lấy shift từ shiftId có sẵn trong payload
    const shift = await ShiftLocalAPI.getShiftById(payload.shiftId)

    // Xây snapshot items
    const itemsSnapshot: ItemSnapshot[] = payload.items.map((i) => {
      const taxRate = i.product.taxRate || 0
      const taxAmount = i.price * i.quantity * (taxRate / 100)
      return {
        productId: i.product.id,
        sku: i.product.sku,
        name: i.product.nameEn,
        price: i.price,
        quantity: i.quantity,
        subtotal: i.price * i.quantity,
        taxRate,
        taxAmount,
        discountAmount: 0, // Hiện tại chưa có giảm giá trên từng item
      }
    })

    const totalTax = itemsSnapshot.reduce((sum, item) => sum + item.taxAmount, 0)

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
      o.totalTax = totalTax
      o.note = payload.note
      o.itemsSnapshot = itemsSnapshot
      o.paymentsSnapshot = paymentsSnapshot
      o.isDeleted = false
    })

    // 3. Prepare OrderItems
    const preparedItems = itemsSnapshot.map((item) =>
      database.get<OrderItemModel>('order_items').prepareCreate((oi) => {
        oi.orderId = preparedOrder.id
        oi.productId = item.productId
        oi.productNameSnapshot = item.name
        oi.priceSnapshot = item.price
        oi.quantity = item.quantity
        oi.refundedQuantity = 0
        oi.subtotal = item.subtotal
        oi.taxRateSnapshot = item.taxRate
        oi.taxAmount = item.taxAmount
        oi.discountAmount = item.discountAmount
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

  /**
   * Theo dõi danh sách đơn hàng theo shiftId (Realtime)
   */
  observeOrdersByShift: (shiftId: string) => {
    return database
      .get<OrderModel>('orders')
      .query(Q.where('is_deleted', Q.notEq(true)), Q.where('shift_id', shiftId))
      .observe()
  },

  /**
   * Lưu dữ liệu đơn hàng từ Server vào Local DB (Dùng sau khi thanh toán Online thành công).
   * Sử dụng batch để đảm bảo tính ACID và đánh dấu 'synced' để không bị push ngược lên.
   */
  saveOrderSyncData: async (data: OrderSyncDataResponse): Promise<void> => {
    const { order, orderItems, payments } = data
    console.log('[saveOrderSyncData] Saving order:', order.id)
    console.log('[saveOrderSyncData] Items count:', orderItems.length)
    console.log('[saveOrderSyncData] Payments count:', payments.length)

    await database.write(async () => {
      // 1. Prepare Order
      const preparedOrder = database.get<OrderModel>('orders').prepareCreate((o) => {
        o._raw = {
          ...o._raw,
          ...order,
          items_snapshot: JSON.stringify(order.items_snapshot),
          payments_snapshot: JSON.stringify(order.payments_snapshot),
          customer_tax_info: order.customer_tax_info
            ? JSON.stringify(order.customer_tax_info)
            : null,
          _status: 'synced',
          _changed: '',
        } as any
      })

      // 2. Prepare Order Items
      const preparedItems = orderItems.map((item) =>
        database.get<OrderItemModel>('order_items').prepareCreate((oi) => {
          oi._raw = {
            ...oi._raw,
            ...item,
            _status: 'synced',
            _changed: '',
          } as any
        }),
      )

      // 3. Prepare Payments
      const preparedPayments = payments.map((payment) =>
        database.get<PaymentModel>('payments').prepareCreate((p) => {
          p._raw = {
            ...p._raw,
            ...payment,
            _status: 'synced',
            _changed: '',
          } as any
        }),
      )

      // 4. Thực hiện batch lưu tất cả bản ghi
      console.log('[saveOrderSyncData] Executing batch...')
      await database.batch(preparedOrder, ...preparedItems, ...preparedPayments)
      console.log('[saveOrderSyncData] Batch completed successfully')
    })
  },
}
