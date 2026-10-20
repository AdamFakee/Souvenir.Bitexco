import { useIsOnline } from '@/shared/hooks/use-is-online'
import { minutes } from '@/shared/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SyncService } from '../sync.service'

/**
 * useSync - Hook quản lý trạng thái và tự động đồng bộ (Auto Sync).
 * @param autoSyncEnabled Mặc định false. Khi truyền true, tự động sync khi có mạng lại hoặc định kỳ 30s.
 */
export const useSync = (autoSyncEnabled = true) => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncError, setLastSyncError] = useState<Error | null>(null)
  const isOnline = useIsOnline()
  const prevIsOnlineRef = useRef<boolean>(isOnline)

  const syncNow = useCallback(async () => {
    setLastSyncError(null)

    if (!isOnline) {
      setLastSyncError(new Error('Mất kết nối mạng. Không thể đồng bộ lúc này.'))
      return
    }

    setIsSyncing(true)
    try {
      await SyncService.drainOutbox()
      await SyncService.pullMasterData()
    } catch (error) {
      setLastSyncError(error as Error)
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline])

  // Tự động kích hoạt sync khi khôi phục mạng hoặc chạy ngầm định kỳ
  useEffect(() => {
    if (!autoSyncEnabled) return

    // 1. Tự động sync ngay khi mạng từ Offline -> Online
    if (!prevIsOnlineRef.current && isOnline) {
      syncNow()
    }
    prevIsOnlineRef.current = isOnline

    // 2. Chạy ngầm định kỳ 5p để đẩy đơn trong outbox khi có kết nối
    if (isOnline) {
      const interval = setInterval(() => {
        SyncService.drainOutbox().catch(() => {})
      }, minutes(5))
      return () => clearInterval(interval)
    }
  }, [autoSyncEnabled, isOnline, syncNow])

  return {
    syncNow,
    isSyncing,
    lastSyncError,
    isOnline,
  }
}
