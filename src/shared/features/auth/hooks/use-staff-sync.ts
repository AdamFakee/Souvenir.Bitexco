import { useIsOnline } from '@/shared/hooks/use-is-online'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { StaffLocalAPI, StaffRemoteAPI } from '../api'
import { AUTH_CONSTANTS, authKeys } from '../const'
import { useAuthStore, useDeviceStore } from '../store'

export const useStaffSync = () => {
  const [isSyncing, setIsSyncing] = useState(false)
  const queryClient = useQueryClient()
  const { setLastStaffSyncAt } = useDeviceStore()
  const isOnline = useIsOnline()

  const syncStaffs = useCallback(async () => {
    const { currentStaff, isShiftOpen } = useAuthStore.getState()

    if (!isOnline) {
      console.warn('[StaffSync] Offline: Sync skipped')
      return
    }

    setIsSyncing(true)
    try {
      const serverStaffs = await StaffRemoteAPI.getAllStaffs()

      if (!serverStaffs || serverStaffs.length === 0) {
        return
      }

      await StaffLocalAPI.syncStaffsToLocal(serverStaffs, {
        currentStaffId: currentStaff?.id ?? undefined,
        isShiftOpen,
      })

      queryClient.invalidateQueries({ queryKey: authKeys.staffs() })
      setLastStaffSyncAt(Date.now())
    } catch (error) {
      console.error('[StaffSync] Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, queryClient, setLastStaffSyncAt])

  const syncIfStale = useCallback(async () => {
    const { lastStaffSyncAt } = useDeviceStore.getState()
    const now = Date.now()
    if (!lastStaffSyncAt || now - lastStaffSyncAt > AUTH_CONSTANTS.STAFF_SYNC_THRESHOLD) {
      await syncStaffs()
    }
  }, [syncStaffs])

  // Auto sync when back online
  useEffect(() => {
    if (isOnline) {
      syncIfStale()
    }
  }, [isOnline, syncIfStale])

  return { syncStaffs, syncIfStale, isSyncing }
}
