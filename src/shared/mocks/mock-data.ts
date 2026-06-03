/**
 * Mock Data — Auth & POS Flow
 *
 * Tập trung toàn bộ mock JSON cho các API đang lỗi.
 * TODO: Xoá file này khi toàn bộ API sẵn sàng.
 *
 * Cấu trúc dữ liệu map 1-1 với API v1.8 spec.
 */

import { EmployeePermission, EmployeeRole } from '../features/app/types/app.types'
import type { Employee, DeviceInfo } from '../features/app/types/app.types'
import type { LoginResponseData } from '../features/auth/api/auth.api'
import type { CashSession } from '../features/shift/api/remote/shift.remote.api'
import type { PagedResponse, StateResponse } from '../types/api'

// ---------------------------------------------------------------------------
// Device
// ---------------------------------------------------------------------------

export const MOCK_DEVICE: DeviceInfo = {
  id: '019e492b-57d6-73ae-9546-8cdfb6bae5c1', // ID thật từ lần activate thành công
  deviceCode: 'TEST 2',
  name: 'TEST 2',
  deviceType: 'desktop',
  location: null as any,
  tenantId: 'a0000000-0000-0000-0000-000000000001',
  status: 'active',
}

// ---------------------------------------------------------------------------
// Employee
// ---------------------------------------------------------------------------

export const MOCK_EMPLOYEE: Employee = {
  id: 'emp-001-uuid-mock',
  email: 'nhanvien@souvenir.vn',
  employeeCode: 'NV001',
  displayName: 'Nguyễn Văn A',
  status: 'active',
  roles: [EmployeeRole.CASHIER],
  permissions: [
    EmployeePermission.CHECKOUT,
    EmployeePermission.REFUND,
    EmployeePermission.PRINT_SHIFT,
  ],
}

// ---------------------------------------------------------------------------
// Auth responses
// ---------------------------------------------------------------------------

export const MOCK_ACCESS_TOKEN = 'mock-access-token-eyJhbGciOiJIUzI1NiJ9.mock'
export const MOCK_REFRESHED_TOKEN = 'mock-access-token-refreshed-eyJhbGciOiJIUzI1NiJ9.mock'

export const MOCK_LOGIN_RESPONSE: LoginResponseData = {
  accessToken: MOCK_ACCESS_TOKEN,
  refreshToken: 'mock-refresh-token-opaque-32bytes-base64url-placeholder',
  employee: MOCK_EMPLOYEE,
  device: { ...MOCK_DEVICE }, // clone để tránh mutation
}

export const MOCK_REFRESH_RESPONSE = {
  accessToken: MOCK_REFRESHED_TOKEN,
}

// ---------------------------------------------------------------------------
// Cash Sessions (Ca làm việc)
// ---------------------------------------------------------------------------

/** Ca đang mở — dùng khi muốn test luồng shiftOpen */
export const MOCK_OPEN_SESSION: CashSession = {
  id: 'session-001-uuid-mock',
  code: 'CS-20260522-001',
  posDeviceId: MOCK_DEVICE.id,
  cashierUserId: MOCK_EMPLOYEE.id,
  state: 'OPEN',
  openedAt: new Date().toISOString(),
  closedAt: null,
  openingCash: 500000,
  countedCash: null,
  expectedCash: null,
  diffCash: null,
  notes: null,
  version: 1,
}

/** Không có ca nào đang mở */
export const MOCK_SESSIONS_EMPTY: PagedResponse<CashSession> = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 25,
}

/** Có 1 ca đang mở */
export const MOCK_SESSIONS_WITH_OPEN: PagedResponse<CashSession> = {
  items: [MOCK_OPEN_SESSION],
  totalCount: 1,
  page: 1,
  pageSize: 25,
}

// ---------------------------------------------------------------------------
// Shift Statistics & Transitions (Thống kê & Đóng ca)
// ---------------------------------------------------------------------------

export interface ShiftStatistics {
  expectedEndingCash: number
}

export const MOCK_SHIFT_STATISTICS: ShiftStatistics = {
  expectedEndingCash: 1750000,
}

export const MOCK_CLOSE_SHIFT_RESPONSE: StateResponse<CashSession> = {
  data: {
    ...MOCK_OPEN_SESSION,
    state: 'CLOSED',
    closedAt: new Date().toISOString(),
    countedCash: 1750000,
    expectedCash: 1750000,
    diffCash: 0,
    version: 2,
  },
  currentState: 'CLOSED',
  allowedActions: [],
}
