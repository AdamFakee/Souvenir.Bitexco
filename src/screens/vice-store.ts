import { create } from 'zustand'

export interface Item {
  id: string
  name: string
  price: number
  quantity: number
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
  /** Số tiền mặt đã nhận */
  cashPaid: number
  /** Số tiền điện tử còn lại */
  nonCashAmount: number
  statusType: 'info' | 'error' | 'success'
  statusTitle: string
  statusMessage: string
  /** Màn hình đang hiển thị hiện tại */
  currentScreen:
    | 'Home'
    | 'Payment'
    | 'CashPayment'
    | 'Success'
    | 'PortablePayment'
    | 'MixPayment'
    | 'Status'

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
  showPortablePayment: (payload?: { total: number }) => void
  showMixPayment: (payload: {
    subtotal: number
    discount: number
    tax: number
    total: number
    cashPaid: number
    nonCashAmount: number
  }) => void
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
    screen:
      | 'Home'
      | 'Payment'
      | 'CashPayment'
      | 'Success'
      | 'PortablePayment'
      | 'MixPayment'
      | 'Status',
  ) => void
  showStatus: (payload: {
    type: 'info' | 'error' | 'success'
    title: string
    message: string
  }) => void
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
  cashPaid: 0,
  nonCashAmount: 0,
  statusType: 'info',
  statusTitle: '',
  statusMessage: '',
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
  showPortablePayment: (payload) =>
    set({
      ...(payload ? { total: payload.total } : {}),
      currentScreen: 'PortablePayment',
      isSuccess: false,
    }),
  showMixPayment: (payload) =>
    set({
      ...payload,
      currentScreen: 'MixPayment',
      isSuccess: false,
    }),
  showCashPayment: (payload) =>
    set({
      ...payload,
      isSuccess: payload.isSuccess || false,
      currentScreen: payload.isSuccess ? 'Success' : 'CashPayment',
    }),
  setCurrentScreen: (currentScreen) => set({ currentScreen }),
  showStatus: (payload) =>
    set({
      statusType: payload.type,
      statusTitle: payload.title,
      statusMessage: payload.message,
      currentScreen: 'Status',
      isSuccess: false,
    }),
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
