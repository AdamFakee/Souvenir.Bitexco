import { PaymentMethod } from '@/shared/lib/database/models/payment'
import { Banknote } from 'lucide-react-native'
import { CashPaymentPopup } from '../components/cash-payment-popup'
import { PaymentStrategy } from '../types/payment-strategy.type'

export const CashStrategy: PaymentStrategy = {
  type: PaymentMethod.CASH,
  label: 'Tiền mặt',
  icon: Banknote,
  isAvailable: () => true, // Tiền mặt luôn available
  PopupComponent: CashPaymentPopup,
}
