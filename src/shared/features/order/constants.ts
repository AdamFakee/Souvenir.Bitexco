import { COLORS } from '@/shared/constants'

export const ORDER_ERROR_MESSAGES: Record<string, string> = {
  'pos.session_not_found': 'Không tìm thấy ca làm việc hiện tại.',
  'order.not_found': 'Không tìm thấy đơn hàng.',
  'order.invalid_state': 'Trạng thái đơn hàng không cho phép trả hàng.',
  'order.return_quantity_invalid': 'Số lượng trả hàng không hợp lệ.',
  'order.return_quantity_exceeded': 'Số lượng trả vượt quá số lượng có thể trả.',
  'order.return_item_not_found': 'Sản phẩm trả hàng không nằm trong đơn gốc.',
  'order.exchange_failed': 'Có lỗi xảy ra khi xử lý đổi hàng.',
  'order.exchange_not_allowed': 'Đơn hàng này không cho phép đổi hàng.',
  'order.exchange_voucher_not_allowed': 'Đơn hàng có khuyến mãi hoặc voucher không được đổi hàng.',
  'order.exchange_replacement_value_invalid':
    'Giá trị hàng đổi mới phải lớn hơn hoặc bằng giá trị hàng trả.',
  'order.exchange_replacement_item_not_found': 'Sản phẩm đổi mới không hợp lệ.',
  'order.exchange_replacement_quantity_invalid': 'Số lượng hàng đổi mới không hợp lệ.',
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
  DRAFT: {
    label: 'Nháp',
    color: '#6B7280',
    bgColor: '#F3F4F6',
  },
  PENDING: {
    label: 'Chờ xác nhận',
    color: COLORS.primary.default,
    bgColor: COLORS.primary.on,
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    color: '#2563EB',
    bgColor: '#DBEAFE',
  },
  PAYMENT_PENDING: {
    label: 'Chờ thanh toán',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  PAID: {
    label: 'Đã thanh toán',
    color: '#059669',
    bgColor: '#D1FAE5',
  },
  UNPAID: {
    label: 'Chưa thanh toán',
    color: '#DC2626',
    bgColor: '#FEE2E2',
  },
  PARTIALLY_PAID: {
    label: 'TT một phần',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  FULFILLING: {
    label: 'Đang giao',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
  FULFILLED: {
    label: 'Đã giao',
    color: COLORS.success.default,
    bgColor: COLORS.success.container,
  },
  INVOICED: {
    label: 'Đã xuất HĐ',
    color: '#0D9488',
    bgColor: '#CCFBF1',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    color: COLORS.success.default,
    bgColor: COLORS.success.container,
  },
  CANCELLED: {
    label: 'Đã huỷ',
    color: COLORS.error.default,
    bgColor: COLORS.error.container,
  },
  ON_HOLD: {
    label: 'Tạm dừng',
    color: '#4B5563',
    bgColor: '#E5E7EB',
  },
  PAYMENT_PARTIAL: {
    label: 'TT một phần',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  PARTIAL: {
    label: 'TT hỗn hợp',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  PARTIAL_REFUNDED: {
    label: 'Hoàn một phần',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
  RETURN_REQUESTED: {
    label: 'Yêu cầu trả',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
  PARTIALLY_RETURNED: {
    label: 'Trả một phần',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
  PARTIALLY_REFUNDED: {
    label: 'Hoàn một phần',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
  RETURNED: {
    label: 'Đã trả',
    color: COLORS.warning.default,
    bgColor: COLORS.warning.container,
  },
  REFUNDED: {
    label: 'Đã hoàn',
    color: COLORS.warning.default,
    bgColor: COLORS.warning.container,
  },
  FAILED: {
    label: 'Thất bại',
    color: COLORS.error.default,
    bgColor: COLORS.error.container,
  },
  PARTIALLY_FULFILLED: {
    label: 'Giao một phần',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
}
