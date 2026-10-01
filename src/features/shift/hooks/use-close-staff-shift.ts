import { useAppStore } from '@/features/app/store/use-app-store'
import { getUnsyncedOrdersCount } from '@/features/order/api'
import { useIsOnline } from '@/shared/hooks/use-is-online'
import { SyncService } from '@/shared/lib/database/sync/sync.service'
import { toast } from '@/shared/store'
import { useState } from 'react'
import { closeShift, getShiftById, getZReport } from '../api'
import { ZReportResponse } from '../types'

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
      const unsyncedCount = await getUnsyncedOrdersCount()
      if (unsyncedCount > 0) {
        throw new Error(
          `Còn ${unsyncedCount} đơn hàng chưa được đồng bộ lên máy chủ. Vui lòng đồng bộ trước khi đóng ca.`,
        )
      }

      // 3. Kích hoạt đồng bộ dữ liệu (Push) lần cuối trước khi đóng ca
      try {
        await SyncService.drainOutbox()
      } catch {
        throw new Error('Đồng bộ dữ liệu thất bại. Vui lòng thử lại.')
      }

      // 4. Lấy thông tin ca hiện tại từ server để biết version thực tế
      const session = await getShiftById(shiftId)
      let currentVersion = session.version

      // 5. Bước 1: Transition 'start_close' -> ca chuyển sang CLOSING
      const startCloseRes = await closeShift(shiftId, {
        action: 'start_close',
        expectedVersion: currentVersion,
      })
      currentVersion = startCloseRes.version
      // 6. Bước 2: Transition 'submit_count' -> ca chuyển sang RECONCILING
      const submitCountRes = await closeShift(shiftId, {
        action: 'submit_count',
        expectedVersion: currentVersion,
        countedCash: variables.actualEndingCash,
        notes: variables.discrepancyReason || null,
      })
      currentVersion = submitCountRes.version
      // 7. Bước 3: Transition 'resolve' -> ca chuyển sang CLOSED
      await closeShift(shiftId, {
        action: 'resolve',
        expectedVersion: currentVersion,
      })

      // Cập nhật app context reset cashSessionId
      const appService = useAppStore.getState().appService
      if (appService) {
        appService.send({ type: 'SHIFT_OPENED', cashSessionId: null as any })
      }

      // 8. Lấy dữ liệu báo cáo Z-report
      const zReportData = await getZReport(shiftId)
      return zReportData
    } catch (error: any) {
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
