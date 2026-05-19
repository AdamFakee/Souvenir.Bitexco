import { useEffect } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { usePosStore } from '../features/pos/store'
import { useConnectionStore } from '../store'

/**
 * Hook khởi tạo ứng dụng (Background Services, Listeners, v.v.)
 */
export const useAppInit = () => {
  useEffect(() => {
    // Lắng nghe trạng thái App (Foreground/Background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Khi người dùng quay lại App (Active)
      if (nextAppState === 'active') {
        // Handle active state
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    // 3. Khởi tạo POS Machine
    usePosStore.getState().initPos()

    // 4. Khởi tạo listeners cho mạng và kết nối POS
    const cleanupConnection = useConnectionStore.getState().initListeners()

    return () => {
      subscription.remove()
      usePosStore.getState().destroyPos()
      cleanupConnection()
    }
  }, [])
}
