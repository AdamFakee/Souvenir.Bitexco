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
  /** Tạm tính */
  subtotal: number
  /** Giảm giá */
  discount: number
  /** Thuế */
  tax: number
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
  currentScreen: 'Home' | 'Payment' | 'CashPayment' | 'Success' | 'PortablePayment'

  // Actions
  updateCart: (payload: {
    items: Item[]
    subtotal: number
    discount: number
    tax: number
    total: number
  }) => void
  setCustomerName: (name: string) => void
  setOrderId: (orderId: string) => void
  showPayment: (payload: {
    qrCodeUrl: string
    subtotal: number
    discount: number
    tax: number
    total: number
  }) => void
  showPortablePayment: () => void
  showCashPayment: (payload: {
    subtotal: number
    discount: number
    tax: number
    total: number
    customerPaid: number
    change: number
    isSuccess?: boolean
  }) => void
  setCurrentScreen: (
    screen: 'Home' | 'Payment' | 'CashPayment' | 'Success' | 'PortablePayment',
  ) => void
  clearCart: () => void
}

export const useViceStore = create<ViceState>((set) => ({
  items: [],
  subtotal: 0,
  discount: 0,
  tax: 0,
  total: 0,
  customerName: '',
  orderId: '',
  qrCodeUrl: '',
  customerPaid: 0,
  change: 0,
  isSuccess: false,
  currentScreen: 'Home',

  updateCart: (payload) => {
    // Nếu đang hiện màn hình thành công mà nhận được giỏ hàng trống (do clear cart)
    // thì bỏ qua để không làm mất màn hình thành công quá sớm.
    // Nếu có món mới (items > 0) thì vẫn cập nhật để phục vụ khách tiếp theo.
    if (useViceStore.getState().isSuccess && payload.items.length === 0) {
      return
    }

    set({
      ...payload,
      currentScreen: 'Home',
      qrCodeUrl: '',
      isSuccess: false,
    })
  },
  setCustomerName: (customerName) => set({ customerName }),
  setOrderId: (orderId) => set({ orderId }),
  showPayment: (payload) =>
    set({
      ...payload,
      currentScreen: 'Payment',
      isSuccess: false,
    }),
  showPortablePayment: () =>
    set({
      currentScreen: 'PortablePayment',
      isSuccess: false,
    }),
  showCashPayment: (payload) =>
    set({
      ...payload,
      isSuccess: payload.isSuccess || false,
      currentScreen: payload.isSuccess ? 'Success' : 'CashPayment',
    }),
  setCurrentScreen: (currentScreen) => set({ currentScreen }),
  clearCart: () =>
    set({
      items: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      customerName: '',
      orderId: '',
      qrCodeUrl: '',
      customerPaid: 0,
      change: 0,
      isSuccess: false,
    }),
}))
