import { useState } from 'react'
import { useAuthStore } from '@/shared/features/auth'
import { SyncService } from '@/shared/lib/database/sync/sync.service'
import { StaffLocalAPI } from '../api'

export const useOpenStaffShift = () => {
  const { authenticate, setShiftOpen } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const openStaffShift = async (variables: { staffId: string; openingBalance: number }) => {
    setIsLoading(true)
    try {
      // 1. Mở ca local
      const shift = await StaffLocalAPI.openStaffShift({
        staffId: variables.staffId,
        openingBalance: variables.openingBalance,
      })

      // 2. Kích hoạt đồng bộ dữ liệu ngay sau khi mở ca thành công
      try {
        await SyncService.performSync()
      } catch (error) {
        console.error('Sync after shift opening failed:', error)
      }

      const session = {
        staffId: variables.staffId,
        shiftId: shift.id,
        loginAt: Date.now(),
      }

      // Lưu session vào store
      authenticate(session)
      setShiftOpen(true)

      return session
    } catch (error) {
      console.error('Open shift error:', error)
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
