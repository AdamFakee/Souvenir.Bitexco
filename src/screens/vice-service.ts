import IminViceScreen from '../../modules/imin-vice-screen'
import { Item } from './vice-store'

export interface UpdateCartPayload {
  items: Item[]
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

/**
 * Service trung gian để giao tiếp với màn hình phụ iMin
 */
export const ViceService = {
  /**
   * Cập nhật danh sách giỏ hàng
   */
  updateCart: (payload: UpdateCartPayload) => {
    // Android Kotlin presentation module cannot automatically convert list of JS objects in Map<String, Any>.
    // We safely stringify it to itemsJson.
    const { items, ...rest } = payload
    IminViceScreen.sendMsgToViceScreen('updateCart', {
      ...rest,
      itemsJson: JSON.stringify(items || []),
    })
  },

  /**
   * Hiển thị mã QR thanh toán
   */
  showPayment: (payload: ShowPaymentPayload) => {
    IminViceScreen.sendMsgToViceScreen('showPayment', payload)
  },

  /**
   * Hiển thị màn hình quẹt thẻ POS di động
   */
  showPortablePayment: () => {
    IminViceScreen.sendMsgToViceScreen('showPortablePayment', {})
  },

  /**
   * Hiển thị thông tin thối tiền mặt
   */
  showCashPayment: (payload: ShowCashPaymentPayload) => {
    IminViceScreen.sendMsgToViceScreen('showCashPayment', payload)
  },

  /**
   * Gửi sự kiện thanh toán thành công
   */
  paymentSuccess: (payload: ShowCashPaymentPayload) => {
    IminViceScreen.sendMsgToViceScreen('showCashPayment', { ...payload, isSuccess: true })
  },

  /**
   * Hiển thị hình ảnh quảng cáo/khuyến mãi
   */
  showPromo: (payload: ShowPromoPayload) => {
    IminViceScreen.sendMsgToViceScreen('showPromo', payload)
  },

  /**
   * Gửi tên khách hàng
   */
  setCustomer: (name: string) => {
    IminViceScreen.sendMsgToViceScreen('setCustomer', { name })
  },

  /**
   * Gửi mã đơn hàng
   */
  setOrderId: (orderId: string) => {
    IminViceScreen.sendMsgToViceScreen('setOrderId', { orderId })
  },
}
