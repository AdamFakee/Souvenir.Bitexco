import type { PaymentMethodCode, PaymentMethodStyle } from '@/shared/types'
import { COLORS } from './color.const'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  cash: 'Tiền mặt',
  qr_bidv: 'QR Code',
  card_bidv: 'Thẻ POS',
  mix: 'Hỗn hợp',
  cong_no: 'Công nợ',
  exchange: 'Đổi hàng',
}

export const PAYMENT_METHOD_LABELS_EN: Record<PaymentMethodCode, string> = {
  cash: 'Cash',
  qr_bidv: 'QR Code',
  card_bidv: 'Card',
  mix: 'Mixed',
  cong_no: 'Debt',
  exchange: 'Exchange',
}

export const PAYMENT_METHOD_STYLES: Record<PaymentMethodCode, PaymentMethodStyle> = {
  cash: {
    label: PAYMENT_METHOD_LABELS.cash,
    color: COLORS.success.onContainer,
    bg: COLORS.success.container,
  },
  qr_bidv: {
    label: PAYMENT_METHOD_LABELS.qr_bidv,
    color: COLORS.primary.onFixedVariant,
    bg: COLORS.primary.fixed,
  },
  card_bidv: {
    label: PAYMENT_METHOD_LABELS.card_bidv,
    color: COLORS.warning.onContainer,
    bg: COLORS.warning.container,
  },
  mix: {
    label: PAYMENT_METHOD_LABELS.mix,
    color: COLORS.surface.onVariant,
    bg: COLORS.surface[100],
  },
  cong_no: {
    label: PAYMENT_METHOD_LABELS.cong_no,
    color: '#b45309',
    bg: '#fef3c7',
  },
  exchange: {
    label: 'Đổi hàng',
    color: '#1e40af',
    bg: '#dbeafe',
  },
}

/** Trả về style của một phương thức thanh toán, fallback về muted nếu không nhận ra */
export function getPaymentMethodStyle(
  method: string | undefined | null,
): PaymentMethodStyle & { label: string } {
  if (!method) return { label: '—', color: COLORS.muted, bg: COLORS.surface[100] }
  const code = method.toLowerCase() as PaymentMethodCode
  return (
    PAYMENT_METHOD_STYLES[code] ?? { label: method, color: COLORS.muted, bg: COLORS.surface[100] }
  )
}

export const PAYMENT_CHART_COLORS: Record<PaymentMethodCode, string> = {
  cash: '#0284c7',
  qr_bidv: '#db2777',
  card_bidv: '#d97706',
  mix: '#6366f1',
  cong_no: '#b45309',
  exchange: '#2563eb',
}
