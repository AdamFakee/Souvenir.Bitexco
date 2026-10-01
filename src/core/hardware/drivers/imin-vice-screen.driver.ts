import IminViceScreen from '../../../../modules/imin-vice-screen'

export interface ViceItem {
  id: string
  name: string
  price: number
  quantity: number
}

export interface UpdateCartPayload {
  items: ViceItem[]
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

/**
 * Driver trung gian giao tiếp với Native Module Màn hình phụ iMin
 */
export const IMinViceScreenDriver = {
  updateCart: (payload: UpdateCartPayload) => {
    const { items, ...rest } = payload
    IminViceScreen.sendMsgToViceScreen('updateCart', {
      ...rest,
      itemsJson: JSON.stringify(items || []),
    })
  },

  showPayment: (payload: ShowPaymentPayload) => {
    IminViceScreen.sendMsgToViceScreen('showPayment', payload)
  },

  showPortablePayment: (payload?: { total: number }) => {
    IminViceScreen.sendMsgToViceScreen('showPortablePayment', payload || {})
  },

  showMixPayment: (payload: ShowMixPaymentPayload) => {
    IminViceScreen.sendMsgToViceScreen('showMixPayment', payload)
  },

  showCashPayment: (payload: ShowCashPaymentPayload) => {
    IminViceScreen.sendMsgToViceScreen('showCashPayment', payload)
  },

  paymentSuccess: (payload: ShowCashPaymentPayload) => {
    IminViceScreen.sendMsgToViceScreen('showCashPayment', { ...payload, isSuccess: true })
  },

  showPromo: (payload: ShowPromoPayload) => {
    IminViceScreen.sendMsgToViceScreen('showPromo', payload)
  },

  setCustomer: (name: string) => {
    IminViceScreen.sendMsgToViceScreen('setCustomer', { name })
  },

  setOrderId: (orderId: string) => {
    IminViceScreen.sendMsgToViceScreen('setOrderId', { orderId })
  },

  showStatus: (payload: { type: 'info' | 'error' | 'success'; title: string; message: string }) => {
    IminViceScreen.sendMsgToViceScreen('showStatus', payload)
  },
}
