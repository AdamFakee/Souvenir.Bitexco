import i18n from '@/shared/lib/i18n'
import { useEffect } from 'react'
import { useAppStore } from '../features/app'
import { usePosStore } from '../features/pos'
import { appSettings, useConnectionStore } from '../store'

/**
 * Hook khởi tạo ứng dụng.
 * - Start appMachine (đọc MMKV → quyết định state ban đầu).
 * - Khởi tạo listeners mạng/POS.
 */
export const useAppInit = () => {
  useEffect(() => {
    // 0. Đồng bộ ngôn ngữ cài đặt đã lưu
    const savedLanguage = appSettings.get('language')
    if (i18n.language !== savedLanguage) {
      i18n.changeLanguage(savedLanguage)
    }

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
