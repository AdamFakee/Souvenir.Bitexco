import { useEffect } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useStaffSync } from '../features/auth'
import { usePosStore } from '../features/pos/store'

/**
 * Hook khởi tạo ứng dụng (Background Services, Listeners, v.v.)
 */
export const useAppInit = () => {
  const { syncIfStale } = useStaffSync()

  useEffect(() => {
    // 1. Đồng bộ dữ liệu khi vừa mở App (nếu dữ liệu cũ)
    syncIfStale()

    // 2. Lắng nghe trạng thái App (Foreground/Background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Khi người dùng quay lại App (Active)
      if (nextAppState === 'active') {
        syncIfStale()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    // 3. Khởi tạo POS Machine
    usePosStore.getState().initPos()

    return () => {
      subscription.remove()
      usePosStore.getState().destroyPos()
    }
  }, [syncIfStale])
}
