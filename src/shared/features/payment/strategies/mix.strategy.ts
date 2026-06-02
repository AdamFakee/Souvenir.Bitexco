import { PaymentMethod } from '@/shared/lib/database'
import { WalletCards } from 'lucide-react-native'
import { MixPaymentPopup } from '../components/mix-payment-popup'
import { PaymentStrategy } from '../types/payment-strategy.type'

export const MixStrategy: PaymentStrategy = {
  type: PaymentMethod.MIX,
  label: 'Hỗn hợp',
  icon: WalletCards,
  isAvailable: (_, isOffline) => !isOffline,
  PopupComponent: MixPaymentPopup,
}
