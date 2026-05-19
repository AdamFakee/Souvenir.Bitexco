/**
 * Chi tiết thông tin giao dịch thẻ từ thiết bị POS di động.
 */
export interface PortablePaymentTransInfo {
  /** Số STAN (System Trace Audit Number) của giao dịch */
  STAN?: string
  /** Số tiền giao dịch (định dạng chuỗi số, ví dụ "54000") */
  amount?: string
  /** Mã phê duyệt (Approval Code) từ ngân hàng */
  approvalCode?: string
  /** Số lô giao dịch (Batch Number) */
  batchNo?: string
  /** Cách thức nhập thông tin thẻ (e.g. "M" cho Manual, "C" cho Contactless, "S" cho Swipe) */
  cardInput?: string
  /** Số thẻ đã được che một phần để bảo mật (e.g. "5151 XXXX XXXX 4768") */
  cardNo?: string
  /** Loại thẻ và ngân hàng phát hành (e.g. "MASTERCARD BIDV") */
  cardType?: string
  /** Mã tiền tệ (ví dụ "704" cho VND) */
  currencyCode?: string
  /** Ngày hết hạn thẻ (đã che một phần, e.g. "XX/XX") */
  expireDate?: string
  /** Mã định danh đơn vị chấp nhận thẻ (Merchant ID) */
  mid?: string
  /** Số serial của thiết bị POS thanh toán */
  posSerial?: string
  /** Số hóa đơn giao dịch (Receipt Number) */
  receiptNo?: string
  /** Số tham chiếu giao dịch (Retrieval Reference Number - RRN) */
  refNo?: string
  /** Mã phản hồi kết quả (e.g. "00" là thành công) */
  returnCode?: string
  /** Mã định danh thiết bị đầu cuối (Terminal ID) */
  tid?: string
  /** Thời gian thực hiện giao dịch (định dạng YYYYMMDD HHmmss, e.g. "20260519 135756") */
  time?: string
  /** Tên giao dịch hiển thị tiếng Việt (e.g. "THANH TOÁN") */
  transName?: string
  /** Trạng thái giao dịch (e.g. "APPROVE") */
  transStatus?: string
  /** Loại giao dịch (e.g. "sale") */
  transType?: string
  /** Mã giao dịch duy nhất từ thiết bị hoặc cổng thanh toán */
  transId?: string
}

/**
 * Kết quả trả về từ thiết bị POS di động khi thực hiện các lệnh (sale, last_trans,...).
 */
export interface PortablePaymentCommandResult {
  /** ID của client gửi yêu cầu */
  clientId?: string
  /** Lệnh thực hiện (e.g. "sale", "last_trans") */
  command?: string
  /** ID giao dịch do phía Merchant (App) gửi đi, thường khớp với orderId */
  merTransId?: string
  /** ID của yêu cầu giao dịch */
  requestId?: string
  /** Trạng thái thực thi lệnh ở mức hệ thống kết nối (e.g. "DONE") */
  status?: string
  /** Mã trạng thái hệ thống (e.g. "0" hoặc 0 nghĩa là thành công) */
  statusCode?: string | number
  /** Văn bản mô tả trạng thái hệ thống (e.g. "DONE") */
  statusText?: string
  /** Chi tiết thông tin giao dịch thẻ từ POS (chỉ có khi thành công) */
  transInfo?: PortablePaymentTransInfo
  /** Phiên bản của dịch vụ kết nối POS (e.g. "2.0.30") */
  version?: string
  /** Thông điệp lỗi chi tiết từ POS khi giao dịch thất bại */
  message?: string
  /** Mã giao dịch trực tiếp nếu nằm ngoài transInfo */
  transId?: string
}
