export enum StaffRole {
  /** Quản trị viên hệ thống (Toàn quyền) */
  ADMIN = 'ADMIN',
  /** Quản lý cửa hàng (Xem báo cáo lãi gộp, quản lý kho) */
  MANAGER = 'MANAGER',
  /** Thu ngân (Chỉ thao tác bán hàng/mở ca/đóng ca) */
  CASHIER = 'CASHIER',
}

export interface Staff {
  id: string
  username: string
  fullname: string
  role: StaffRole
  password: string
  isActive: boolean
  isDeleted: boolean
}

export interface EmployeeItem {
  id: string
  displayName: string
  email: string
  status: 'active' | 'inactive'
}
