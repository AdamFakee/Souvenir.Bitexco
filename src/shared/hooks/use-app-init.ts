import { useAppStore } from '../features/app'
import { usePosStore } from '../features/pos'
import { useConnectionStore } from '../store'
import { useEffect } from 'react'

/**
 * Hook khởi tạo ứng dụng.
 * - Start appMachine (đọc MMKV → quyết định state ban đầu).
 * - Khởi tạo listeners mạng/POS.
 */
export const useAppInit = () => {
  useEffect(() => {
    // 1. Start appMachine (singleton)
    useAppStore.getState().initApp()

    // 2. Start posMachine (singleton)
    usePosStore.getState().initPos()

    // 3. Khởi tạo listeners cho mạng và kết nối POS
    const cleanupConnection = useConnectionStore.getState().initListeners()

    return () => {
      useAppStore.getState().destroyApp()
      usePosStore.getState().destroyPos()
      cleanupConnection()
    }
  }, [])
}
