import { Staff } from './staff.type'

export interface AuthSession {
  staffId: Staff['id']
  shiftId: string
  loginAt: number
}

export type AuthStatus = 'IDLE' | 'SYNCING' | 'AUTHENTICATED' | 'LOCKED' | 'ERROR'

export interface OpenStaffShiftRequest {
  staffId: Staff['id']
  openingBalance: number
}

export interface StaffSessionStatus {
  lastClosingBalance: number
  lastClosedAt: string
  isShiftOpen: boolean
  currentStaffId?: string // ID của nhân viên đang giữ ca (nếu có)
}
