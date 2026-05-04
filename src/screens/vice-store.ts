import { create } from 'zustand'

export interface Item {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
}

interface ViceState {
  /** Danh sách sản phẩm trong giỏ hàng */
  items: Item[]
  /** Tổng tiền đơn hàng */
  total: number
  /** Tên khách hàng */
  customerName: string
  /** Mã đơn hàng */
  orderId: string
  /** Đường dẫn QR code thanh toán */
  qrCodeUrl: string
  /** Số tiền khách đưa (tiền mặt) */
  customerPaid: number
  /** Số tiền thối lại */
  change: number
  /** Trạng thái thanh toán thành công */
  isSuccess: boolean
  /** Màn hình đang hiển thị hiện tại */
  currentScreen: 'Home' | 'Payment' | 'CashPayment' | 'Success'

  // Actions
  updateCart: (items: Item[], total: number) => void
  setCustomerName: (name: string) => void
  setOrderId: (orderId: string) => void
  showPayment: (qrCodeUrl: string, total: number) => void
  showCashPayment: (
    total: number,
    customerPaid: number,
    change: number,
    isSuccess?: boolean,
  ) => void
  setCurrentScreen: (screen: 'Home' | 'Payment' | 'CashPayment' | 'Success') => void
}

export const useViceStore = create<ViceState>((set) => ({
  items: [],
  total: 0,
  customerName: '',
  orderId: '',
  qrCodeUrl: '',
  customerPaid: 0,
  change: 0,
  isSuccess: false,
  currentScreen: 'Home',

  updateCart: (items, total) => {
    // Nếu đang hiện màn hình thành công mà nhận được giỏ hàng trống (do clear cart)
    // thì bỏ qua để không làm mất màn hình thành công quá sớm.
    // Nếu có món mới (items > 0) thì vẫn cập nhật để phục vụ khách tiếp theo.
    if (useViceStore.getState().isSuccess && items.length === 0) {
      return
    }

    set({
      items,
      total,
      currentScreen: 'Home',
      qrCodeUrl: '',
      isSuccess: false,
    })
  },
  setCustomerName: (customerName) => set({ customerName }),
  setOrderId: (orderId) => set({ orderId }),
  showPayment: (qrCodeUrl, total) =>
    set({
      qrCodeUrl,
      total,
      currentScreen: 'Payment',
      isSuccess: false,
    }),
  showCashPayment: (total, customerPaid, change, isSuccess = false) =>
    set({
      total,
      customerPaid,
      change,
      isSuccess,
      currentScreen: isSuccess ? 'Success' : 'CashPayment',
    }),
  setCurrentScreen: (currentScreen) => set({ currentScreen }),
}))
