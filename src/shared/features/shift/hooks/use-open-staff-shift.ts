import { useAuthStore } from '@/shared/features/auth'
import { SyncService } from '@/shared/lib/database/sync/sync.service'
import { useState } from 'react'
import { ShiftRemoteAPI } from '../api/remote/shift.remote.api'

export const useOpenStaffShift = () => {
  const { authenticate, setShiftOpen } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const openStaffShift = async (variables: { staffId: string; openingBalance: number }) => {
    setIsLoading(true)
    try {
      // 1. Mở ca online trên Server trước để lấy Shift ID chính chủ
      const response = await ShiftRemoteAPI.openShift({
        staffId: variables.staffId,
        startingCash: variables.openingBalance,
      })

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể mở ca trực tuyến')
      }

      const shiftId = response.data.shiftId

      // 2. Kích hoạt đồng bộ dữ liệu (Pull các thay đổi khác nếu có)
      try {
        await SyncService.performSync()
      } catch (error) {
        console.error('Sync after shift opening failed:', error)
      }

      const session = {
        staffId: variables.staffId,
        shiftId,
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
