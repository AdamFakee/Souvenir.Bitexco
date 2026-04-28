import { Staff } from '../../types'
import MockStaffData from './mock-staff.json'
/**
 * REMOTE API - Giao tiếp với Server
 */
export const StaffRemoteAPI = {
  /**
   * Lấy danh sách nhân viên từ Server (Dùng cho Sync)
   */
  getAllStaffs: async (): Promise<Staff[]> => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    return MockStaffData.staffs as Staff[]
  },
}
