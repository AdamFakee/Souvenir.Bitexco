import { database, ShiftModel } from '@/shared/lib'
import { ShiftStatus } from '@/shared/lib/database/models/shift'

export const StaffLocalAPI = {
  /**
   * Mở ca làm việc trong database cục bộ
   */
  openStaffShift: async (params: {
    staffId: string
    openingBalance: number
  }): Promise<ShiftModel> => {
    return await database.write(async () => {
      return await database.get<ShiftModel>('shifts').create((record) => {
        record.staffId = params.staffId
        record.startTime = Date.now()
        record.startingCash = params.openingBalance
        record.expectedEndingCash = params.openingBalance
        record.cashRevenue = 0
        record.qrRevenue = 0
        record.totalOrders = 0
        record.status = ShiftStatus.OPEN
        record.isDeleted = false
      })
    })
  },
}
