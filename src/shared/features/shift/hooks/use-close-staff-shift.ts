import { useAuthStore } from '@/shared/features/auth'
import { SyncService } from '@/shared/lib/database/sync/sync.service'
import { toast } from '@/shared/store'
import { useState } from 'react'
import { ShiftRemoteAPI } from '../api/remote/shift.remote.api'

export const useCloseStaffShift = () => {
  const { logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const closeStaffShift = async (
    shiftId: string,
    variables: { actualEndingCash: number; discrepancyReason?: string },
  ) => {
    setIsLoading(true)
    try {
      // 1. Kích hoạt đồng bộ dữ liệu (Push) trước khi đóng ca
      // Để đảm bảo tất cả đơn hàng đã lên server
      try {
        await SyncService.performSync()
      } catch (error) {
        console.error('Sync before shift closing failed:', error)
        throw new Error('Đồng bộ dữ liệu thất bại. Vui lòng kiểm tra mạng và thử lại.')
      }

      // 2. Đóng ca online
      const response = await ShiftRemoteAPI.closeShift({
        shiftId: shiftId,
        actualEndingCash: variables.actualEndingCash,
        discrepancyReason: variables.discrepancyReason,
      })

      if (!response.success) {
        throw new Error(response.message || 'Lỗi khi đóng ca trực tuyến')
      }

      // Đăng xuất và xóa session
      logout()

      return true
    } catch (error: any) {
      console.error('Close shift error:', error)
      toast.error(error?.message || 'Có lỗi xảy ra khi đóng ca')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    closeStaffShift,
    isLoading,
  }
}
