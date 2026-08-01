import { SyncService } from '@/shared/lib/database/sync/sync.service'
import i18n from '@/shared/lib/i18n'
import { useEffect } from 'react'
import { useAppStore } from '../features/app/store/use-app-store'
import { usePosStore } from '../features/pos/store/use-pos-store'
import { appSettings, useConnectionStore } from '../store'
import { minutes } from '../utils'

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

    // 4. Khởi chạy bộ đếm thời gian đồng bộ định kỳ 15 phút (Chỉ pull master data sản phẩm & danh mục)
    const intervalId = setInterval(() => {
      const isOnline = useConnectionStore.getState().isNetworkConnected
      const accessToken = useAppStore.getState().appService?.getSnapshot().context.accessToken

      if (isOnline && accessToken) {
        SyncService.pullMasterData().catch()
      }
    }, minutes(15))

    return () => {
      useAppStore.getState().destroyApp()
      usePosStore.getState().destroyPos()
      cleanupConnection()
      clearInterval(intervalId)
    }
  }, [])
}
