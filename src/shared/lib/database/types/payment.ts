/**
 * Dữ liệu Snapshot ghi nhận lịch sử các giao dịch thanh toán của đơn hàng
 */
export interface PaymentSnapshot {
  /** Phương thức thanh toán (CASH, CARD, BANK_TRANSFER) */
  method: string
  /** Số tiền giao dịch */
  amount: number
}

/**
 * Chuẩn hóa dữ liệu danh sách giao dịch thanh toán Snapshot
 */
export const sanitizePaymentsSnapshot = (rawPayments: any): PaymentSnapshot[] => {
  if (!Array.isArray(rawPayments)) return []
  return rawPayments.map((payment: any) => ({
    method: String(payment.method || ''),
    amount: Number(payment.amount || 0),
  }))
}
