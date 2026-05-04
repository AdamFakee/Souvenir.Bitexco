import IminViceScreen from '../../modules/imin-vice-screen'
import { Item } from './vice-store'

export interface UpdateCartPayload {
  items: Item[]
  total: number
}

export interface ShowPaymentPayload {
  qrCodeUrl: string
  total: number
}

export interface ShowCashPaymentPayload {
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
    IminViceScreen.sendMsgToViceScreen('updateCart', payload)
  },

  /**
   * Hiển thị mã QR thanh toán
   */
  showPayment: (payload: ShowPaymentPayload) => {
    IminViceScreen.sendMsgToViceScreen('showPayment', payload)
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
