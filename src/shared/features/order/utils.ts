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

/**
 * Lấy nhãn và màu sắc hiển thị rút gọn, chính xác cho Nhân viên bán hàng tại POS.
 */
export const getOrderDisplayStatus = (order: {
  state?: string | null
  status?: string | null
  paymentStatus?: string | null
  fulfillmentStatus?: string | null
  returnStatus?: string | null
  code?: string | null
}): { label: string; color: string; bgColor: string } => {
  // 1. Đã hủy
  if (order.state === 'CANCELLED' || order.status === 'FAILED' || order.status === 'CANCELLED') {
    return { label: 'Đã hủy', color: '#DC2626', bgColor: '#FEE2E2' }
  }

  // 2. Hoàn trả hàng (cần kiểm tra trước COMPLETED vì đơn trả hàng hoàn tất cũng có state=COMPLETED)
  if (
    order.returnStatus === 'RETURNED' ||
    order.status === 'REFUNDED' ||
    order.status === 'RETURNED' ||
    order.code?.startsWith('RT')
  ) {
    return { label: 'Hoàn hàng', color: '#DC2626', bgColor: '#FEE2E2' }
  }
  if (order.returnStatus === 'PARTIAL') {
    return { label: 'Hoàn 1 phần', color: '#D97706', bgColor: '#FEF3C7' }
  }

  // 3. Hoàn thành
  if (order.state === 'COMPLETED' || order.status === 'COMPLETED') {
    return { label: 'Hoàn thành', color: '#059669', bgColor: '#D1FAE5' }
  }

  // 4. Tạm giữ
  if (order.state === 'ON_HOLD') {
    return { label: 'Tạm giữ', color: '#D97706', bgColor: '#FEF3C7' }
  }

  // 5. Nháp
  if (order.state === 'DRAFT') {
    return { label: 'Nháp', color: '#6B7280', bgColor: '#F3F4F6' }
  }

  // 6. Đã xác nhận (CONFIRMED) hoặc trạng thái khác
  if (order.state === 'CONFIRMED' || order.status === 'CONFIRMED') {
    if (order.paymentStatus === 'PAID' && order.fulfillmentStatus === 'FULFILLED') {
      return { label: 'Hoàn thành', color: '#059669', bgColor: '#D1FAE5' }
    }
    if (order.paymentStatus === 'PAID') {
      return { label: 'Đã thu đủ', color: '#059669', bgColor: '#D1FAE5' }
    }
    if (order.paymentStatus === 'PARTIAL') {
      return { label: 'Thu một phần', color: '#D97706', bgColor: '#FEF3C7' }
    }
    if (order.paymentStatus === 'UNPAID') {
      return { label: 'Chưa thanh toán', color: '#6B7280', bgColor: '#F3F4F6' }
    }
  }

  // Fallback to primary status translation
  const statusStr = order.status || 'PENDING'
  if (statusStr === 'COMPLETED') {
    return { label: 'Hoàn thành', color: '#059669', bgColor: '#D1FAE5' }
  }
  if (statusStr === 'REFUNDED' || statusStr === 'RETURNED') {
    return { label: 'Hoàn hàng', color: '#DC2626', bgColor: '#FEE2E2' }
  }
  if (statusStr === 'FAILED' || statusStr === 'CANCELLED') {
    return { label: 'Đã hủy', color: '#DC2626', bgColor: '#FEE2E2' }
  }
  return { label: 'Đang xử lý', color: '#D97706', bgColor: '#FEF3C7' }
}
