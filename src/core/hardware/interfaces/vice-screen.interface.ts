export interface ViceCartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export interface UpdateCartPayload {
  items: ViceCartItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
}

export interface ShowPaymentPayload {
  qrCodeUrl: string
  subtotal: number
  discount: number
  tax: number
  total: number
}

export interface ShowCashPaymentPayload {
  subtotal: number
  discount: number
  tax: number
  total: number
  customerPaid: number
  change: number
  isSuccess?: boolean
}

export interface ShowPromoPayload {
  imageUrl: string
}

export interface ShowMixPaymentPayload {
  subtotal: number
  discount: number
  tax: number
  total: number
  cashPaid: number
  nonCashAmount: number
}

export interface ShowStatusPayload {
  type: 'info' | 'error' | 'success'
  title: string
  message: string
}

export interface IViceScreenAdapter {
  updateCart(payload: UpdateCartPayload): void
  showPayment(payload: ShowPaymentPayload): void
  showPortablePayment(payload?: { total: number }): void
  showMixPayment(payload: ShowMixPaymentPayload): void
  showCashPayment(payload: ShowCashPaymentPayload): void
  paymentSuccess(payload: ShowCashPaymentPayload): void
  showPromo(payload: ShowPromoPayload): void
  setCustomer(name: string): void
  setOrderId(orderId: string): void
  showStatus(payload: ShowStatusPayload): void
}
