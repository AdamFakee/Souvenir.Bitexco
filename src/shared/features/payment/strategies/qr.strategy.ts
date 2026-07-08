import QRIcon from '@/assets/icons/QR.svg'
import { QrPaymentPopup } from '../components/qr-payment-popup'
import type { PaymentStrategy } from '../types/payment-strategy.type'

export const QrStrategy: PaymentStrategy = {
  type: 'qr_bidv',
  label: 'QRCode',
  icon: QRIcon,
  isAvailable: (_, isOffline) => !isOffline, // Cần online để fetch mã QR
  PopupComponent: QrPaymentPopup,
}
