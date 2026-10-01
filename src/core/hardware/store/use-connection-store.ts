import { toast } from '@/shared/store/use-alert-store'
import NetInfo from '@react-native-community/netinfo'
import { create } from 'zustand'
import { IngenicoEdcDriver, TerminalConfig } from '../drivers/ingenico-edc.driver'

interface ConnectionState {
  isNetworkConnected: boolean
  isPosConnected: boolean | null
  isCheckingPosConnection: boolean
  checkPosConnection: (config?: TerminalConfig) => Promise<boolean>
  initListeners: (onNetworkRestored?: () => void) => () => void
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  isNetworkConnected: true,
  isPosConnected: null,
  isCheckingPosConnection: false,

  checkPosConnection: async (config?: TerminalConfig) => {
    if (!config) {
      set({ isPosConnected: false, isCheckingPosConnection: false })
      return false
    }
    if (get().isCheckingPosConnection) {
      return get().isPosConnected ?? false
    }
    set({ isCheckingPosConnection: true })
    try {
      const resStr = await IngenicoEdcDriver.connect(config)
      const parsed = JSON.parse(resStr)
      const statusCode = parsed?.statusCode ?? -1
      const connected = statusCode === 0 || statusCode === '0'

      const prevConnected = get().isPosConnected
      if (prevConnected !== connected) {
        set({ isPosConnected: connected, isCheckingPosConnection: false })
      } else {
        set({ isCheckingPosConnection: false })
      }
      return connected
    } catch {
      set({ isPosConnected: false, isCheckingPosConnection: false })
      return false
    }
  },

  initListeners: (onNetworkRestored?: () => void) => {
    let initialNetworkCheck = true

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
            onNetworkRestored?.()
          }
        }
      }
    })

    return () => {
      unsubscribeNet()
    }
  },
}))
