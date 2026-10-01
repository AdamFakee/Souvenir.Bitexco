import type { PaymentMethodCode } from '@/shared/types'
import type { PortablePaymentCommandResult } from '@/core/hardware'

// Re-export để các consumer cũ vẫn import từ đây được
export type { PaymentMethodCode } from '@/shared/types'

/**
 * Dữ liệu Snapshot ghi nhận lịch sử các giao dịch thanh toán của đơn hàng.
 * Trường `method` dùng PaymentMethodCode làm chuẩn duy nhất.
 */
export interface PaymentSnapshot {
  /** Phương thức thanh toán (PaymentMethodCode) */
  method: PaymentMethodCode
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
    method: (payment.method as PaymentMethodCode) || 'cash',
    amount: Number(payment.amount || 0),
    cashTendered: payment.cashTendered !== undefined ? Number(payment.cashTendered) : undefined,
    cashChange: payment.cashChange !== undefined ? Number(payment.cashChange) : undefined,
    referenceCode: payment.referenceCode ? String(payment.referenceCode) : undefined,
    cardType: payment.cardType ? String(payment.cardType) : undefined,
    portablePaymentResult: payment.portablePaymentResult || undefined,
  }))
}
