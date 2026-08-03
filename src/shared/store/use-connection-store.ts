import { PortablePaymentService } from '@/shared/features/payment/utils/portable-payment.service'
import { toast } from '@/shared/store/use-alert-store'
import NetInfo from '@react-native-community/netinfo'
import { create } from 'zustand'
import { seconds } from '../utils'

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
      // Chỉ update state khi giá trị thay đổi — tránh re-render vô ích
      if (prevConnected !== connected) {
        set({ isPosConnected: connected, isCheckingPosConnection: false })
      } else {
        set({ isCheckingPosConnection: false })
      }

      if (prevConnected !== connected) {
        if (prevConnected === null) {
          if (!connected) {
            // toast.error('Không tìm thấy máy POS thanh toán. Vui lòng kiểm tra lại!', 'Lỗi thiết bị')
          }
        } else {
          if (!connected) {
            // toast.error('Mất kết nối máy POS thanh toán!', 'Lỗi kết nối')
          } else {
            // toast.success('Đã kết nối máy POS thanh toán thành công!', 'Kết nối thành công')
          }
        }
      }
      return connected
    } catch {
      const prevConnected = get().isPosConnected
      set({ isPosConnected: false, isCheckingPosConnection: false })

      if (prevConnected !== false) {
        if (prevConnected === null) {
          // toast.error('Không tìm thấy máy POS thanh toán. Vui lòng kiểm tra lại!', 'Lỗi thiết bị')
        } else {
          // toast.error('Mất kết nối máy POS thanh toán!', 'Lỗi kết nối')
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
            const appService =
              require('@/shared/features/app/store/use-app-store').useAppStore.getState().appService
            appService?.send({ type: 'NETWORK_RESTORED' })
          }
        }

        if (isConnected) {
          try {
            toast.success('Đã khôi phục!', 'Kết nối thành công')
            const { SyncService } = require('@/shared/lib/database/sync/sync.service')
            SyncService.drainOutbox().catch(() => {})
          } catch {}
        }
      }
    })

    // 2. Chạy check kết nối POS ban đầu
    get().checkPosConnection()

    // 3. Thiết lập vòng lặp kiểm tra kết nối POS định kỳ mỗi 60 giây
    const intervalId = setInterval(() => {
      get().checkPosConnection()
    }, seconds(15))

    return () => {
      unsubscribeNet()
      clearInterval(intervalId)
    }
  },
}))
