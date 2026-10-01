import CardIcon from '@/assets/icons/Card.svg'
import { PortablePaymentPopup } from '../components'
import type { PaymentStrategy } from '../types/payment-strategy.type'

/**
 * Chiến lược thanh toán bằng quẹt thẻ qua máy POS di động (Ingenico EcrClient).
 * Phương thức này giao tiếp trực tiếp qua mạng local socket nên sẵn sàng hoạt động
 * ngay cả khi mất kết nối Internet (hỗ trợ chế độ offline hoàn hảo).
 */
export const PortableCardStrategy: PaymentStrategy = {
  type: 'card_bidv',
  label: 'Thẻ (POS)',
  icon: CardIcon,
  isAvailable: () => true,
  PopupComponent: PortablePaymentPopup,
}
