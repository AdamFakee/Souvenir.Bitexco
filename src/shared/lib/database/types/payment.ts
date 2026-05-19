import type { PortablePaymentCommandResult } from '../../../features/payment/types/portable-payment.type'

/**
 * Các phương thức thanh toán được hỗ trợ
 */
export enum PaymentMethod {
  /** Thanh toán bằng Tiền mặt */
  CASH = 'CASH',
  /** Thanh toán bằng thẻ (POS quẹt thẻ) */
  CARD = 'CARD',
  /** Chuyển khoản ngân hàng (Quét mã QR) */
  BANK_TRANSFER = 'BANK_TRANSFER',
}

/**
 * Dữ liệu Snapshot ghi nhận lịch sử các giao dịch thanh toán của đơn hàng
 */
export interface PaymentSnapshot {
  /** Phương thức thanh toán */
  method: PaymentMethod
  /** Số tiền giao dịch */
  amount: number
  /** Tiền khách đưa (Dùng cho Tiền mặt) */
  cashTendered?: number
  /** Tiền thối lại (Dùng cho Tiền mặt) */
  cashChange?: number
  /** Mã tham chiếu giao dịch (Dùng cho QR/Bank/Card) */
  referenceCode?: string
  /** Loại thẻ (Dùng cho Card) */
  cardType?: string
  /** Lưu toàn bộ đối tượng kết quả thanh toán từ máy POS di động */
  portablePaymentResult?: PortablePaymentCommandResult
}

/**
 * Chuẩn hóa dữ liệu danh sách giao dịch thanh toán Snapshot
 */
export const sanitizePaymentsSnapshot = (rawPayments: any): PaymentSnapshot[] => {
  if (!Array.isArray(rawPayments)) return []
  return rawPayments.map((payment: any) => ({
    method: (payment.method as PaymentMethod) || PaymentMethod.CASH,
    amount: Number(payment.amount || 0),
    cashTendered: payment.cashTendered !== undefined ? Number(payment.cashTendered) : undefined,
    cashChange: payment.cashChange !== undefined ? Number(payment.cashChange) : undefined,
    referenceCode: payment.referenceCode ? String(payment.referenceCode) : undefined,
    cardType: payment.cardType ? String(payment.cardType) : undefined,
    portablePaymentResult: payment.portablePaymentResult || undefined,
  }))
}
