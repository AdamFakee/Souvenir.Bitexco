import { useAppStore } from '@/features/app/store/use-app-store'
import { SyncService } from '@/shared/lib/database/sync/sync.service'
import { useState } from 'react'
import { openShift } from '../api'

export const useOpenStaffShift = () => {
  const [isLoading, setIsLoading] = useState(false)

  const openStaffShift = async (variables: { posDeviceId: string; openingBalance: number }) => {
    setIsLoading(true)
    try {
      // 1. Mở ca online trên Server trước để lấy Shift ID chính chủ
      const response = await openShift({
        posDeviceId: variables.posDeviceId,
        openingCash: variables.openingBalance,
      })

      // API v1.8 returns CashSession directly. If it didn't throw, it's successful.
      const shiftId = response.id

      // 2. Kích hoạt đồng bộ dữ liệu (Pull các thay đổi khác nếu có)
      try {
        await SyncService.pullMasterData()
      } catch {}

      // Update machine state
      const appService = useAppStore.getState().appService
      if (appService) {
        appService.send({ type: 'SHIFT_OPENED', cashSessionId: shiftId })
      }

      return shiftId
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    openStaffShift,
    isLoading,
  }
}
