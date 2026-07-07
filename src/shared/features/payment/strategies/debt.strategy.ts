import { FileText } from 'lucide-react-native'
import { DebtPaymentPopup } from '../components/debt-payment-popup'
import type { PaymentStrategy } from '../types/payment-strategy.type'

export const DebtStrategy: PaymentStrategy = {
  type: 'cong_no',
  label: 'Công nợ',
  icon: FileText,
  displayOrder: 99,
  // Luôn hiện với agent, disable khi isDebt = false (để nhân viên biết đại lý này không được nợ)
  isAvailable: (ctx) => ctx.affiliate?.agentType === 'agent',
  PopupComponent: DebtPaymentPopup,
}
