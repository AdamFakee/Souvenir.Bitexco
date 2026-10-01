import type { OrderPricingSummary } from '@/core/pos-engine'
import type { PaymentPopupProps } from '@/features/payment/types/payment-strategy.type'
import type { CartContext } from '@/features/pos/machines/cart.machine'
import type { CartItem } from '@/shared/types'
import type React from 'react'

export interface SessionMeta {
  staffId: string
  staffName?: string
  shiftId: string
  activeSessionId: string | null
  printRef?: React.RefObject<any>
}

/**
 * PaymentPayloadAdapter - Chuyển đổi dữ liệu từ Cart Snapshot + Pricing sang PaymentPopupProps
 * Đảm bảo tính nhất quán (Consistency) và không làm thay đổi interface của bất kỳ Payment Machine / Popup nào.
 */
export class PaymentPayloadAdapter {
  static toPaymentProps(
    cartContext: CartContext,
    pricing: OrderPricingSummary,
    session: SessionMeta,
    onSuccess: (result: any) => void,
  ): PaymentPopupProps {
    const items = Object.values(cartContext.items || {}) as CartItem[]

    return {
      total: pricing.total,
      discount: pricing.totalDiscount,
      appliedVoucher: cartContext.appliedVoucher,
      items,
      staffId: session.staffId,
      shiftId: session.shiftId,
      staffName: session.staffName,
      activeSessionId: session.activeSessionId,
      printRef: session.printRef,
      note: cartContext.note,
      affiliate: cartContext.affiliate,
      onSuccess,
    }
  }
}
