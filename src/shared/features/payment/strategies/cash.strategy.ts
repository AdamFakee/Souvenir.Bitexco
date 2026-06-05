import { Banknote } from 'lucide-react-native'
import { CashPaymentPopup } from '../components/cash-payment-popup'
import type { PaymentStrategy } from '../types/payment-strategy.type'

export const CashStrategy: PaymentStrategy = {
  type: 'cash',
  label: 'Tiền mặt',
  icon: Banknote,
  isAvailable: () => true, // Tiền mặt luôn available
  PopupComponent: CashPaymentPopup,
}
