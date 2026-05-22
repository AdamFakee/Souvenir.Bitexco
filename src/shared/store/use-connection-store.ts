import { PortablePaymentService } from '@/shared/features/payment/utils/portable-payment.service'
import { toast } from '@/shared/store/use-alert-store'
import NetInfo from '@react-native-community/netinfo'
import { create } from 'zustand'

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

      const prevConnected = get().isPosConnected
      set({ isPosConnected: connected, isCheckingPosConnection: false })

      if (prevConnected !== connected) {
        if (prevConnected === null) {
          // Lần kiểm tra đầu tiên khi khởi chạy ứng dụng
          if (!connected) {
            toast.error('Không tìm thấy máy POS thanh toán. Vui lòng kiểm tra lại!', 'Lỗi thiết bị')
          }
        } else {
          // Các lần thay đổi trạng thái tiếp theo
          if (!connected) {
            toast.error('Mất kết nối máy POS thanh toán!', 'Lỗi kết nối')
          } else {
            toast.success('Đã kết nối máy POS thanh toán thành công!', 'Kết nối thành công')
          }
        }
      }
      return connected
    } catch {
      const prevConnected = get().isPosConnected
      set({ isPosConnected: false, isCheckingPosConnection: false })

      if (prevConnected !== false) {
        if (prevConnected === null) {
          toast.error('Không tìm thấy máy POS thanh toán. Vui lòng kiểm tra lại!', 'Lỗi thiết bị')
        } else {
          toast.error('Mất kết nối máy POS thanh toán!', 'Lỗi kết nối')
        }
      }
      return false
    }
  },

  initListeners: () => {
    let initialNetworkCheck = true

    // 1. Lắng nghe thay đổi kết nối mạng internet
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const isConnected = !!state.isConnected
      const prevConnected = get().isNetworkConnected

      if (isConnected !== prevConnected || initialNetworkCheck) {
        set({ isNetworkConnected: isConnected })

        if (initialNetworkCheck) {
          initialNetworkCheck = false
          if (!isConnected) {
            toast.error('Không có mạng internet. Vui lòng kiểm tra lại kết nối!', 'Lỗi kết nối')
          }
        } else {
          if (!isConnected) {
            toast.error('Mất kết nối mạng internet!', 'Lỗi kết nối')
          } else {
            toast.success('Đã khôi phục kết nối mạng internet!', 'Kết nối thành công')
          }
        }
      }
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
