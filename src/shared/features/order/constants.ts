import { COLORS } from '@/shared/constants'
import { OrderStatus } from '@/shared/lib/database/models/order'

export const ORDER_ERROR_MESSAGES: Record<string, string> = {
  'pos.session_not_found': 'Không tìm thấy ca làm việc hiện tại.',
  'order.not_found': 'Không tìm thấy đơn hàng.',
  'order.invalid_state': 'Trạng thái đơn hàng không cho phép trả hàng.',
  'order.return_quantity_invalid': 'Số lượng trả hàng không hợp lệ.',
  'order.return_quantity_exceeded': 'Số lượng trả vượt quá số lượng có thể trả.',
  'order.return_item_not_found': 'Sản phẩm trả hàng không nằm trong đơn gốc.',
}

export const getOrderErrorMessage = (errorCode?: string, status?: number) => {
  if (errorCode && ORDER_ERROR_MESSAGES[errorCode]) return ORDER_ERROR_MESSAGES[errorCode]
  if (status === 409) return 'Dữ liệu đã thay đổi, vui lòng tải lại đơn hàng.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác trả hàng.'
  if (status === 404) return 'Không tìm thấy dữ liệu trả hàng.'
  if (status === 429) return 'Thao tác quá nhanh, vui lòng thử lại sau.'
  return 'Có lỗi xảy ra khi xử lý trả hàng.'
}

export const ORDER_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  ALL: {
    label: 'Tất cả',
    color: COLORS.primary.onFixedVariant,
    bgColor: COLORS.primary.fixed,
  },
  [OrderStatus.PENDING]: {
    label: 'Chờ thanh toán',
    color: COLORS.primary.default,
    bgColor: COLORS.primary.on,
  },
  [OrderStatus.COMPLETED]: {
    label: 'Hoàn thành',
    color: COLORS.success.default,
    bgColor: COLORS.success.container,
  },
  [OrderStatus.REFUNDED]: {
    label: 'Hoàn tiền',
    color: COLORS.warning.default,
    bgColor: COLORS.warning.container,
  },
  [OrderStatus.FAILED]: {
    label: 'Thất bại',
    color: COLORS.error.default,
    bgColor: COLORS.error.container,
  },
}
