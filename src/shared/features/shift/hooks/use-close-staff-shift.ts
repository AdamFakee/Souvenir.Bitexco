import { useAuthStore } from '@/shared/features/auth'
import { ShiftModel } from '@/shared/lib'
import { SyncService } from '@/shared/lib/database/sync/sync.service'
import { useState } from 'react'
import { ShiftLocalAPI } from '../api'

export const useCloseStaffShift = () => {
  const { logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const closeStaffShift = async (
    shift: ShiftModel,
    variables: { actualEndingCash: number; discrepancyReason?: string },
  ) => {
    setIsLoading(true)
    try {
      // 1. Đóng ca local
      await ShiftLocalAPI.closeShift(shift, {
        actualEndingCash: variables.actualEndingCash,
        discrepancyReason: variables.discrepancyReason,
      })

      // 2. Kích hoạt đồng bộ dữ liệu ngay sau khi đóng ca
      try {
        await SyncService.performSync()
      } catch (error) {
        console.error('Sync after shift closing failed:', error)
      }

      // Đăng xuất
      logout()

      return true
    } catch (error) {
      console.error('Close shift error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    closeStaffShift,
    isLoading,
  }
}
