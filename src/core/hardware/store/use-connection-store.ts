import { axiosClient } from '@/shared/lib/axios'
import { toast } from '@/shared/store/use-alert-store'
import NetInfo from '@react-native-community/netinfo'
import { create } from 'zustand'
import { IngenicoEdcDriver, TerminalConfig } from '../drivers/ingenico-edc.driver'

export type OfflineReason = 'NETWORK' | 'SERVER' | null

interface ConnectionState {
  isNetworkConnected: boolean
  offlineReason: OfflineReason
  downtimeStartTime: number | null
  isPosConnected: boolean | null
  isCheckingPosConnection: boolean
  checkPosConnection: (config?: TerminalConfig) => Promise<boolean>
  checkServerHealth: (overrideIsNetwork?: boolean) => Promise<boolean>
  initListeners: (onNetworkRestored?: () => void) => () => void
}

const updateHealthState = (
  set: (state: Partial<ConnectionState>) => void,
  get: () => ConnectionState,
  isNetwork: boolean,
  isServer: boolean,
) => {
  let reason: OfflineReason = null
  if (!isNetwork) {
    reason = 'NETWORK'
  } else if (!isServer) {
    reason = 'SERVER'
  }

  // isNetworkConnected = true NẾU CẢ MẠNG VÀ SERVER ĐỀU TỐT
  const isOnline = isNetwork && isServer

  const prevReason = get().offlineReason
  const prevStartTime = get().downtimeStartTime

  let newStartTime = prevStartTime
  if (reason !== null && prevReason === null) {
    // Vừa chuyển từ Online -> Offline: Đặt thời gian bắt đầu gián đoạn
    newStartTime = Date.now()
  } else if (reason === null) {
    // Đã khôi phục Online: Reset đồng hồ
    newStartTime = null
  }

  set({
    isNetworkConnected: isOnline,
    offlineReason: reason,
    downtimeStartTime: newStartTime,
  })
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  isNetworkConnected: true,
  offlineReason: null,
  downtimeStartTime: null,
  isPosConnected: null,
  isCheckingPosConnection: false,

  checkServerHealth: async (overrideIsNetwork?: boolean) => {
    let isNet = overrideIsNetwork
    if (isNet === undefined) {
      const netState = await NetInfo.fetch()
      isNet = !!netState.isConnected
    }

    if (!isNet) {
      updateHealthState(set, get, false, false)
      return false
    }

    try {
      const res = await axiosClient.get<string>('/health', { timeout: 3000 })
      const isHealthy = res.status === 200
      updateHealthState(set, get, true, isHealthy)
      return isHealthy
    } catch {
      updateHealthState(set, get, true, false)
      return false
    }
  },

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
    let healthInterval: ReturnType<typeof setInterval> | null = null

    const runHealthCheck = () => {
      get().checkServerHealth()
    }

    // Ping health ngay khi khởi tạo
    runHealthCheck()

    // Định kỳ check health mỗi 15 giây
    healthInterval = setInterval(runHealthCheck, 15000)

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const isConnected = !!state.isConnected
      const prevConnected = get().isNetworkConnected

      if (isConnected !== prevConnected || initialNetworkCheck) {
        if (!isConnected) {
          updateHealthState(set, get, false, false)
        } else {
          get()
            .checkServerHealth(true)
            .then((isHealthy) => {
              if (isHealthy && !initialNetworkCheck) {
                onNetworkRestored?.()
              }
            })
        }

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

    return () => {
      unsubscribeNet()
      if (healthInterval) clearInterval(healthInterval)
    }
  },
}))
