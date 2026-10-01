/**
 * Mã phương thức thanh toán — chuẩn duy nhất trong toàn bộ codebase.
 * Map 1-1 với giá trị field `method` gửi lên API và lưu trong SQLite snapshot.
 */
export type PaymentMethodCode = 'cash' | 'qr_bidv' | 'card_bidv' | 'mix' | 'cong_no' | 'exchange'

/**
 * Phương thức thanh toán phụ (không dùng tiền mặt) trong giao dịch thanh toán hỗn hợp.
 */
export type MixPaymentMethod = 'qr' | 'card'

export interface PaymentMethodStyle {
  label: string
  color: string
  bg: string
}
