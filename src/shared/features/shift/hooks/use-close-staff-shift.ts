import { SyncService } from '@/shared/lib/database/sync/sync.service'
import { toast } from '@/shared/store'
import { useState } from 'react'
import { ShiftRemoteAPI, ZReportResponse } from '../api/remote/shift.remote.api'
import { useIsOnline } from '@/shared/hooks'
import { OrderLocalAPI } from '@/shared/features/order/api/local/order.local.api'

export const useCloseStaffShift = () => {
  const [isLoading, setIsLoading] = useState(false)
  const isOnline = useIsOnline()

  const closeStaffShift = async (
    shiftId: string,
    variables: { actualEndingCash: number; discrepancyReason?: string },
  ): Promise<ZReportResponse | null> => {
    setIsLoading(true)
    try {
      // 1. Kiểm tra trạng thái mạng
      if (!isOnline) {
        throw new Error('Mất kết nối mạng. Đóng ca yêu cầu kết nối mạng ổn định.')
      }

      // 2. Kiểm tra đơn hàng chưa đồng bộ
      const unsyncedCount = await OrderLocalAPI.getUnsyncedOrdersCount()
      if (unsyncedCount > 0) {
        throw new Error(
          `Còn ${unsyncedCount} đơn hàng chưa được đồng bộ lên máy chủ. Vui lòng đồng bộ trước khi đóng ca.`,
        )
      }

      // 3. Kích hoạt đồng bộ dữ liệu (Push) lần cuối trước khi đóng ca
      try {
        await SyncService.performSync()
      } catch (error) {
        console.error('Final sync before shift closing failed:', error)
        throw new Error('Đồng bộ dữ liệu thất bại. Vui lòng thử lại.')
      }

      // 4. Lấy thông tin ca hiện tại từ server để biết version thực tế
      const session = await ShiftRemoteAPI.getShiftById(shiftId)
      let currentVersion = session.version

      console.log(
        '[useCloseStaffShift] Starting shift closing. Current server version:',
        currentVersion,
      )

      // 5. Bước 1: Transition 'start_close' -> ca chuyển sang CLOSING
      const startCloseRes = await ShiftRemoteAPI.closeShift(shiftId, {
        action: 'start_close',
        expectedVersion: currentVersion,
      })
      currentVersion = startCloseRes.version
      console.log('[useCloseStaffShift] start_close transition done. New version:', currentVersion)

      // 6. Bước 2: Transition 'submit_count' -> ca chuyển sang RECONCILING
      const submitCountRes = await ShiftRemoteAPI.closeShift(shiftId, {
        action: 'submit_count',
        expectedVersion: currentVersion,
        countedCash: variables.actualEndingCash,
        notes: variables.discrepancyReason || null,
      })
      currentVersion = submitCountRes.version
      console.log('[useCloseStaffShift] submit_count transition done. New version:', currentVersion)

      // 7. Bước 3: Transition 'resolve' -> ca chuyển sang CLOSED
      await ShiftRemoteAPI.closeShift(shiftId, {
        action: 'resolve',
        expectedVersion: currentVersion,
      })
      console.log('[useCloseStaffShift] resolve transition done. Shift is now CLOSED.')

      // 8. Lấy dữ liệu báo cáo Z-report
      const zReportData = await ShiftRemoteAPI.getZReport(shiftId)
      console.log('[useCloseStaffShift] Z-report loaded successfully.')

      return zReportData
    } catch (error: any) {
      console.error('Close shift error:', error)
      toast.error(error?.message || 'Có lỗi xảy ra khi đóng ca')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    closeStaffShift,
    isLoading,
  }
}
