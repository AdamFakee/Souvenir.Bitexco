import MixIcon from '@/assets/icons/Mix.svg'
import { MixPaymentPopup } from '../components/mix-payment-popup'
import type { PaymentStrategy } from '../types/payment-strategy.type'

export const MixStrategy: PaymentStrategy = {
  type: 'mix',
  label: 'Hỗn hợp',
  icon: MixIcon,
  isAvailable: (_, isOffline) => !isOffline,
  PopupComponent: MixPaymentPopup,
}
