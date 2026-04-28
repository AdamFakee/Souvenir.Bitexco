import { Staff, StaffRole } from '../types'

export const isManagerRole = (staff: Staff | null): boolean => staff?.role === StaffRole.MANAGER

export const isAdminRole = (staff: Staff | null): boolean => staff?.role === StaffRole.ADMIN

export const isCashierRole = (staff: Staff | null): boolean => staff?.role === StaffRole.CASHIER

export const hasAdminPrivileges = (staff: Staff | null): boolean => {
  if (!staff) return false
  const adminRoles: StaffRole[] = [StaffRole.ADMIN, StaffRole.MANAGER]
  return adminRoles.includes(staff.role)
}

export const getRoleLabel = (role: StaffRole): string => {
  const labels: Record<StaffRole, string> = {
    ADMIN: 'Quản trị viên',
    MANAGER: 'Quản lý',
    CASHIER: 'Thu ngân',
  }
  return labels[role]
}
