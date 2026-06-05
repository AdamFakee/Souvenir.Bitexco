import { WalletCards } from 'lucide-react-native'
import { MixPaymentPopup } from '../components/mix-payment-popup'
import type { PaymentStrategy } from '../types/payment-strategy.type'

export const MixStrategy: PaymentStrategy = {
  type: 'mix',
  label: 'Hỗn hợp',
  icon: WalletCards,
  isAvailable: (_, isOffline) => !isOffline,
  PopupComponent: MixPaymentPopup,
}
