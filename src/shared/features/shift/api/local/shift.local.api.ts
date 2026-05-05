import { database, ShiftModel } from '@/shared/lib'
import { ShiftStatus } from '@/shared/lib/database/models/shift'
import { Q } from '@nozbe/watermelondb'

export const ShiftLocalAPI = {
  /**
   * Lấy ca làm việc đang mở của nhân viên
   */
  getOpenShift: async (staffId: string): Promise<ShiftModel> => {
    const shifts = await database
      .get<ShiftModel>('shifts')
      .query(
        Q.where('staff_id', staffId),
        Q.where('status', ShiftStatus.OPEN),
        Q.where('is_deleted', false),
      )
      .fetch()

    if (shifts.length === 0) {
      throw new Error('Không tìm thấy ca làm việc đang mở')
    }

    return shifts[0]
  },

  /**
   * Lấy ca làm việc theo ID (không quan tâm status, dùng khi đã có ID cụ thể)
   */
  getShiftById: async (shiftId: string): Promise<ShiftModel> => {
    try {
      return await database.get<ShiftModel>('shifts').find(shiftId)
    } catch {
      throw new Error(`Không tìm thấy thông tin ca làm việc (ID: ${shiftId})`)
    }
  },

  /**
   * Cập nhật doanh thu và số lượng đơn hàng của ca trong 1 lần prepareUpdate duy nhất.
   * Để tránh lỗi "cannot update a record with pending changes" khi gọi nhiều lần prepareUpdate trên cùng 1 record.
   */
  prepareUpdateStats: (
    shift: ShiftModel,
    params: { cashAmount?: number; qrAmount?: number; incrementOrderCount?: boolean },
  ) => {
    return shift.prepareUpdate((s) => {
      if (params.cashAmount) {
        s.cashRevenue = (s.cashRevenue ?? 0) + params.cashAmount
        s.expectedEndingCash = s.startingCash + s.cashRevenue
      }
      if (params.qrAmount) {
        s.qrRevenue = (s.qrRevenue ?? 0) + params.qrAmount
      }
      if (params.incrementOrderCount) {
        s.totalOrders = (s.totalOrders ?? 0) + 1
      }
    })
  },
}
