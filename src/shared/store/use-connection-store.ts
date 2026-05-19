import { create } from 'zustand'
import NetInfo from '@react-native-community/netinfo'
import { PortablePaymentService } from '@/shared/features/payment/utils/portable-payment.service'

interface ConnectionState {
  isNetworkConnected: boolean
  isPosConnected: boolean | null
  isCheckingPosConnection: boolean
  checkPosConnection: () => Promise<boolean>
  initListeners: () => () => void
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  isNetworkConnected: true,
  isPosConnected: null,
  isCheckingPosConnection: false,

  checkPosConnection: async () => {
    if (get().isCheckingPosConnection) {
      return get().isPosConnected ?? false
    }
    set({ isCheckingPosConnection: true })
    try {
      const resStr = await PortablePaymentService.connect()
      const parsed = JSON.parse(resStr)
      const statusCode = parsed?.statusCode ?? -1
      const connected = statusCode === 0
      set({ isPosConnected: connected, isCheckingPosConnection: false })
      return connected
    } catch (err) {
      console.log('[ConnectionStore] checkPosConnection failed:', err)
      set({ isPosConnected: false, isCheckingPosConnection: false })
      return false
    }
  },

  initListeners: () => {
    // 1. Lắng nghe thay đổi kết nối mạng internet
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      set({ isNetworkConnected: !!state.isConnected })
    })

    // 2. Chạy check kết nối POS ban đầu
    get().checkPosConnection()

    // 3. Thiết lập vòng lặp kiểm tra kết nối POS định kỳ mỗi 15 giây
    const intervalId = setInterval(() => {
      get().checkPosConnection()
    }, 15000)

    // Trả về hàm hủy đăng ký các listener và dọn dẹp timer
    return () => {
      unsubscribeNet()
      clearInterval(intervalId)
    }
  },
}))
