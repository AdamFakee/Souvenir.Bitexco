import CashIcon from '@/assets/icons/Cash.svg'
import { CashPaymentPopup } from '../components/cash-payment-popup'
import type { PaymentStrategy } from '../types/payment-strategy.type'

export const CashStrategy: PaymentStrategy = {
  type: 'cash',
  label: 'Tiền mặt',
  icon: CashIcon,
  isAvailable: () => true, // Tiền mặt luôn available
  PopupComponent: CashPaymentPopup,
}
