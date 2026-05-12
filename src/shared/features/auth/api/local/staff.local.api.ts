import { database, ShiftModel, StaffModel } from '@/shared/lib/database'
import { ShiftStatus } from '@/shared/lib/database/models/shift'
import { Q } from '@nozbe/watermelondb'
import { Staff, StaffSessionStatus } from '../../types'

/**
 * LOCAL API - Truy vấn dữ liệu từ DATABASE CỤC BỘ (WatermelonDB)
 */
export const StaffLocalAPI = {
  /**
   * Lấy trạng thái phiên làm việc hiện tại từ DB cục bộ
   */
  getStaffSessionStatus: async (): Promise<StaffSessionStatus> => {
    // Logic truy vấn bảng shifts cục bộ
    const openShifts = await database
      .get<ShiftModel>('shifts')
      .query(Q.where('status', ShiftStatus.OPEN))
      .fetch()

    return {
      lastClosingBalance: 500000,
      lastClosedAt: new Date().toISOString(),
      isShiftOpen: openShifts.length > 0,
      currentStaffId: openShifts[0]?.staffId || undefined,
    }
  },

  /**
   * Lấy danh sách TOÀN BỘ nhân viên trong máy (phục vụ đối soát sync)
   */
  getAllStaffs: async (): Promise<StaffModel[]> => {
    return database.get<StaffModel>('staff').query().fetch()
  },

  /**
   * Đăng nhập bằng tài khoản & mật khẩu
   */
  login: async (params: { username: string; password: string }): Promise<StaffModel | null> => {
    const staffs = await database
      .get<StaffModel>('staff')
      .query(
        Q.where('username', params.username),
        Q.where('password', params.password),
        Q.where('is_active', true),
      )
      .fetch()
    return staffs.length > 0 ? staffs[0] : null
  },

  /**
   * Lấy danh sách ID của các nhân viên đang có ca làm việc mở
   */
  getAllOpenShifts: async (): Promise<ShiftModel[]> => {
    return await database.get<ShiftModel>('shifts').query(Q.where('status', 'OPEN')).fetch()
  },

  /**
   * Đồng bộ danh sách nhân viên từ Server xuống DB cục bộ
   */
  syncStaffsToLocal: async (
    serverStaffs: Staff[],
    context: {
      currentStaffId?: string
      isShiftOpen: boolean
    },
  ): Promise<void> => {
    const { currentStaffId, isShiftOpen } = context
    const staffCollection = database.get<StaffModel>('staff')

    await database.write(async () => {
      const localStaffs = await StaffLocalAPI.getAllStaffs()
      const openShifts = await StaffLocalAPI.getAllOpenShifts()
      const staffIdWithOpenShifts = new Set(openShifts.map((s) => s.staffId))

      const actions: any[] = []

      // 1. Process server staffs: Cập nhật hoặc tạo mới
      serverStaffs.forEach((remote: Staff) => {
        const local = localStaffs.find((l) => l.id === remote.id)
        if (local) {
          actions.push(
            local.prepareUpdate((record) => {
              record.username = remote.username
              record.fullname = remote.fullname
              record.role = remote.role
              record.password = remote.password

              // Bảo toàn isActive nếu staff đang có ca mở hoặc đang login
              const hasOpenShift = staffIdWithOpenShifts.has(local.id)
              const isLoggedIn = currentStaffId === local.id && isShiftOpen

              if (!remote.isActive && (hasOpenShift || isLoggedIn)) {
                record.isActive = true
              } else {
                record.isActive = remote.isActive
              }
            }),
          )
        } else {
          actions.push(
            staffCollection.prepareCreate((record) => {
              record._raw.id = remote.id
              record.username = remote.username
              record.fullname = remote.fullname
              record.role = remote.role
              record.password = remote.password
              record.isActive = remote.isActive
            }),
          )
        }
      })

      // 2. Vô hiệu hóa nhân viên không còn trên server
      const serverStaffIds = new Set(serverStaffs.map((s) => s.id))
      localStaffs.forEach((local) => {
        if (!serverStaffIds.has(local.id)) {
          const isCurrentlyLoggedIn = currentStaffId === local.id
          const hasOpenShiftLocally = isShiftOpen && isCurrentlyLoggedIn
          const hasOpenShiftInDB = staffIdWithOpenShifts.has(local.id)

          if (!isCurrentlyLoggedIn && !hasOpenShiftLocally && !hasOpenShiftInDB) {
            actions.push(
              local.prepareUpdate((record) => {
                record.isActive = false
              }),
            )
          }
        }
      })

      if (actions.length > 0) {
        await database.batch(...actions)
      }
    })
  },

  /**
   * Mở ca làm việc trong database cục bộ
   */
  openStaffShift: async (params: {
    staffId: string
    outletId: string
    deviceId: string
    openingBalance: number
  }): Promise<ShiftModel> => {
    return await database.write(async () => {
      return await database.get<ShiftModel>('shifts').create((record) => {
        record.staffId = params.staffId
        record.deviceId = params.deviceId
        record.startTime = Date.now()
        record.startingCash = params.openingBalance
        record.isDeleted = false
      })
    })
  },

  /**
   * Lấy thông tin nhân viên theo ID
   */
  getStaffById: async (id: string): Promise<StaffModel | null> => {
    try {
      return await database.get<StaffModel>('staff').find(id)
    } catch (error) {
      console.error(`[StaffLocalAPI] Error fetching staff by id ${id}:`, error)
      return null
    }
  },
}
