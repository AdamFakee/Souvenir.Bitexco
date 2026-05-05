import { PaymentMethod } from '@/shared/lib/database/models/payment'
import { QrCode } from 'lucide-react-native'
import { QrPaymentPopup } from '../components/qr-payment-popup'
import { PaymentStrategy } from '../types/payment-strategy.type'

export const QrStrategy: PaymentStrategy = {
  type: PaymentMethod.BANK_TRANSFER,
  label: 'QRCode',
  icon: QrCode,
  isAvailable: (_, isOffline) => !isOffline, // Cần online để fetch mã QR
  PopupComponent: QrPaymentPopup,
}
