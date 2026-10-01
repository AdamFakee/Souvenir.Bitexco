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
  'order.affiliate_not_found': 'CTV/Đối tác không tồn tại.',
  'order.affiliate_not_active': 'CTV/Đối tác không còn hoạt động.',
  'order.debt_not_allowed': 'Đối tác này không được phép ghi nợ.',
  'order.debt_limit_exceeded': 'Vượt hạn mức công nợ cho phép.',
  'order.partner_not_found': 'Đối tác không tồn tại hoặc đã ngừng hoạt động.',
  'order.partner_credit_not_allowed': 'Đối tác chưa được kích hoạt tính năng thanh toán công nợ.',
  'order.credit_limit_exceeded': 'Vượt hạn mức công nợ cho phép của đối tác.',
}

export const getOrderErrorMessage = (errorCode?: string, status?: number) => {
  if (errorCode) {
    if (ORDER_ERROR_MESSAGES[errorCode]) return ORDER_ERROR_MESSAGES[errorCode]
    for (const key of Object.keys(ORDER_ERROR_MESSAGES)) {
      if (errorCode.startsWith(key)) {
        return ORDER_ERROR_MESSAGES[key]
      }
    }
  }

  if (status === 400) return 'Dữ liệu gửi lên không hợp lệ.'
  if (status === 401) return 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (status === 404) return 'Không tìm thấy tài nguyên yêu cầu.'
  if (status === 409) return 'Dữ liệu bị xung đột hoặc đã được xử lý trước đó.'
  if (status === 500) return 'Lỗi hệ thống máy chủ. Vui lòng thử lại sau.'

  return undefined
}
