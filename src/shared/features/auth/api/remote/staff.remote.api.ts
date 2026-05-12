import { StaffRole } from '@/shared/lib/database/models/staff'
import { PullChangesParams } from '@/shared/lib/database/sync'
import { Staff } from '../../types'
import mockStaffData from './mock-staff.json'

/**
 * StaffRaw - Cấu trúc dữ liệu Nhân viên khớp với Backend/Database
 */
export interface StaffRaw {
  id: string
  username: string
  fullname: string
  role: StaffRole
  password: string
  is_active: boolean
  is_deleted: boolean
  created_at?: number
  updated_at?: number
}

/**
 * StaffSyncChanges - Cấu trúc các thay đổi của Nhân viên
 */
export interface StaffSyncChanges {
  staff: {
    created: StaffRaw[]
    updated: StaffRaw[]
    deleted: string[]
  }
}

/**
 * StaffRemoteAPI - Xử lý đồng bộ dữ liệu Nhân viên với Server
 */
export const StaffRemoteAPI = {
  /**
   * Lấy toàn bộ danh sách nhân viên từ Server
   */
  getAllStaffs: async (): Promise<Staff[]> => {
    console.log('StaffRemoteAPI: Loading staffs from mock-staff.json...')

    // Map dữ liệu từ JSON sang cấu trúc mà Local API mong đợi (CamelCase)
    return mockStaffData.staffs.map((s: any) => ({
      id: s.id,
      username: s.username,
      fullname: s.fullname,
      role: s.role as StaffRole,
      password: s.password,
      isActive: s.isActive,
      isDeleted: false,
    }))
  },

  fetchChanges: async ({ lastPulledAt }: PullChangesParams): Promise<any> => {
    console.log('StaffRemoteAPI: Fetching changes (Pull)...', { lastPulledAt })

    return {
      staff: { created: [], updated: [], deleted: [] },
    }
  },

  pushChanges: async () => {
    // Không đẩy thay đổi lên vì Staff là read-only trên Client
  },
}
