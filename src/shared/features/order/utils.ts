import { OrderStatus } from '@/shared/lib/database'

/**
 * Trạng thái đơn hàng thực tế từ hệ thống quản lý kho/đơn hàng WMS.
 */
export type WmsOrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'FULFILLING'
  | 'FULFILLED'
  | 'INVOICED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD'
  | 'PAYMENT_PARTIAL'
  | 'RETURN_REQUESTED'
  | 'PARTIALLY_RETURNED'
  | 'PARTIALLY_REFUNDED'
  | 'RETURNED'
  | 'REFUNDED'
  | 'FAILED'

const ALLOWED_STATUSES: (WmsOrderStatus | OrderStatus | string)[] = [
  'PAID',
  'FULFILLED',
  'COMPLETED',
]

export const checkCanReturn = (order: {
  status?: WmsOrderStatus | OrderStatus | string
  canReturn?: boolean
}): boolean => {
  if (order.canReturn === false) return false
  if (order.canReturn === true) return true

  const status = order.status
  if (!status) return true

  const eligibleStatuses = ['PAID', 'FULFILLED', 'COMPLETED', 'CONFIRMED']
  return eligibleStatuses.includes(status)
}

/**
 * Kiểm tra đơn hàng có đủ điều kiện đổi hàng hay không.
 * Điều kiện:
 * 1. Trạng thái thuộc ['PAID', 'FULFILLED', 'COMPLETED']
 * 2. canReturn của backend cho phép (khác false)
 * 3. Chưa quá 1 ngày (24 giờ) kể từ khi tạo đơn hàng
 * 4. Không áp dụng voucher hoặc giảm giá
 */
export const checkCanExchange = (order: {
  status: WmsOrderStatus | OrderStatus | string
  createdAt: Date | string
  canReturn?: boolean
  voucherCode?: string | null
  voucherDiscount?: number
  discount?: number
}): boolean => {
  // 1. Trạng thái đơn hàng phải hợp lệ
  if (!ALLOWED_STATUSES.includes(order.status)) return false

  // 2. Phải được phép trả/đổi từ backend
  if (order.canReturn === false) return false

  // 3. Thời gian tạo đơn hàng không được quá 1 ngày (24 giờ)
  const createdAtTime = new Date(order.createdAt).getTime()
  const oneDayInMs = 24 * 60 * 60 * 1000
  if (Date.now() - createdAtTime > oneDayInMs) {
    return false
  }

  // 4. Đơn hàng không áp dụng voucher hoặc giảm giá
  if (
    order.voucherCode ||
    (order.voucherDiscount && order.voucherDiscount > 0) ||
    (order.discount && order.discount > 0)
  ) {
    return false
  }

  return true
}
