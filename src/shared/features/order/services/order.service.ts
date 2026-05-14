import { database } from '@/shared/lib/database/database'
import OrderModel, { OrderStatus } from '@/shared/lib/database/models/order'
import ProductModel from '@/shared/lib/database/models/product'
import ShiftModel from '@/shared/lib/database/models/shift'
import { PaymentMethod } from '@/shared/lib/database/models'

export const OrderService = {
  /**
   * Hoàn tiền toàn bộ cho một đơn hàng.
   * Cập nhật trạng thái, cộng kho, thêm payment âm vào snapshot và trừ doanh thu ca.
   */
  refundOrder: async (order: OrderModel, reason: string, currentShiftId: string) => {
    return await database.write(async () => {
      // 0. Kiểm tra trạng thái đơn hàng
      if (order.status !== OrderStatus.COMPLETED) {
        throw new Error(
          `Không thể hoàn tiền cho đơn hàng có trạng thái "${order.status}". Chỉ đơn hàng "Hoàn thành" mới có thể hoàn trả.`,
        )
      }

      // 1. Cập nhật trạng thái đơn hàng thành REFUNDED và push payment âm vào snapshot
      await order.update((o) => {
        o.status = OrderStatus.REFUNDED
        o.refundReason = reason
        // Thêm bản ghi thanh toán âm vào snapshot (Mặc định hoàn bằng TIỀN MẶT)
        const currentPayments = o.paymentsSnapshot || []
        o.paymentsSnapshot = [
          ...currentPayments,
          {
            method: PaymentMethod.CASH,
            amount: -order.total,
          },
        ]
      })

      // 2. Cộng lại tồn kho cho các sản phẩm trong đơn
      const items = order.itemsSnapshot || []
      for (const item of items) {
        const product = await database.get<ProductModel>('products').find(item.productId)
        if (!product) {
          throw new Error(`Không tìm thấy sản phẩm "${item.name}" trong hệ thống để cộng lại kho.`)
        }
        await product.update((p) => {
          p.stock = (p.stock || 0) + item.quantity
        })
      }

      // 3. Cập nhật doanh thu của ca làm việc HIỆN TẠI (Chỉ trừ vào Cash Revenue)
      const shift = await database.get<ShiftModel>('shifts').find(currentShiftId)
      if (!shift) {
        throw new Error(
          `Không tìm thấy thông tin ca làm việc hiện tại (ID: ${currentShiftId}) để thực hiện hoàn tiền.`,
        )
      }
      await shift.update((s) => {
        const refundAmount = order.total
        s.cashRevenue = (s.cashRevenue || 0) - refundAmount
        s.expectedEndingCash = (s.expectedEndingCash || 0) - refundAmount
        s.totalOrders = Math.max(0, (s.totalOrders || 0) - 1)
      })
    })
  },
}
