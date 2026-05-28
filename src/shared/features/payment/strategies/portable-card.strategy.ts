import { PaymentMethod } from '@/shared/lib/database'
import { useConnectionStore } from '@/shared/store'
import { CreditCard } from 'lucide-react-native'
import { PortablePaymentPopup } from '../components'
import { PaymentStrategy } from '../types/payment-strategy.type'

/**
 * Chiến lược thanh toán bằng quẹt thẻ qua máy POS di động (Ingenico EcrClient).
 * Phương thức này giao tiếp trực tiếp qua mạng local socket nên sẵn sàng hoạt động
 * ngay cả khi mất kết nối Internet (hỗ trợ chế độ offline hoàn hảo).
 */
export const PortableCardStrategy: PaymentStrategy = {
  type: PaymentMethod.CARD,
  label: 'Thẻ (POS)',
  icon: CreditCard,
  isAvailable: () => true,
  PopupComponent: PortablePaymentPopup,
}
