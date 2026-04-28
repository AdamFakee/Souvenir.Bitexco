import { useState, useCallback } from 'react'
import { SyncService } from '../sync.service'
import { useIsOnline } from '@/shared/hooks'

/**
 * useSync - Hook để quản lý trạng thái đồng bộ
 */
export const useSync = () => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncError, setLastSyncError] = useState<Error | null>(null)
  const isOnline = useIsOnline()

  const syncNow = useCallback(async () => {
    setLastSyncError(null)

    if (!isOnline) {
      setLastSyncError(new Error('Mất kết nối mạng. Không thể đồng bộ lúc này.'))
      return
    }

    setIsSyncing(true)
    try {
      await SyncService.performSync()
    } catch (error) {
      setLastSyncError(error as Error)
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline])

  return {
    syncNow,
    isSyncing,
    lastSyncError,
    isOnline,
  }
}
