import type { PaymentMethodCode } from '@/shared/features/payment/types/payment.constants'
import type { ActorRefFrom } from 'xstate'
import type { appMachine } from '../machines/app.machine'

export type { PaymentMethodCode } from '@/shared/features/payment/types/payment.constants'

// ---------------------------------------------------------------------------
// Enums — nhất quán với StaffRole, PaymentMethodCode trong codebase
// ---------------------------------------------------------------------------

export enum EmployeeRole {
  CASHIER = 'cashier',
}

export enum EmployeePermission {
  CHECKOUT = 'pos:checkout', // Tạo đơn hàng
  REFUND = 'pos:refund', // Hoàn tiền — hiển thị nút refund
  PRINT_SHIFT = 'print:shift', // In Z-report cuối ca
}

// ---------------------------------------------------------------------------
// Entities — map 1-1 với API response
// ---------------------------------------------------------------------------

/**
 * Thông tin thiết bị POS.
 * Map với response của POST /v1/pos-devices/activate
 * và field `device` trong response của POST /v1/device/auth/login.
 * Persist → MMKV (kích hoạt 1 lần duy nhất).
 */
export interface DeviceInfo {
  id: string // uuid — gửi vào body login
  deviceCode: string // "POS-001"
  name: string // "Quầy 1"
  deviceType: string // "pos" | "tablet"
  location: string // "Tầng 1"
  tenantId: string // uuid
  warehouseId?: string // uuid - ID kho hàng của thiết bị
  status?: string // "active" — có trong login response
}

/**
 * Thông tin nhân viên POS sau khi đăng nhập.
 * Map với field `employee` trong response của POST /v1/device/auth/login.
 * In-memory only (không persist).
 */
export interface Employee {
  id: string
  email: string
  employeeCode: string // "NV001"
  displayName: string // "Nguyễn Văn A"
  status: string // "active"
  roles: EmployeeRole[]
  permissions: EmployeePermission[] // dùng để kiểm soát quyền UI
}

// PaymentMethodCode được định nghĩa tập trung tại @/shared/features/payment/types/payment.constants
// và re-export ở trên — không định nghĩa lại ở đây

/**
 * Cấu hình phương thức thanh toán.
 * Persist → MMKV.
 */
export interface PaymentMethodConfig {
  code: PaymentMethodCode
  name: string
  icon: string
  enabled: boolean
  provider: string | null
  settlementDays: number
  displayOrder: number
  isDefault: boolean
  bankConfig?: TenantConfig | null
  terminalConfig?: TerminalConfig | null
}

/**
 * Cấu hình terminal/ECR của phương thức thanh toán.
 * Persist → MMKV.
 */
export interface TerminalConfig {
  posUrl: string
  merchantName: string
  cashierId: string
  license: string
}

/**
 * Cấu hình ngân hàng của tenant — dùng khi tạo mã QR thanh toán.
 * Persist → MMKV.
 */
export interface TenantConfig {
  bankCode: string
  accountNo: string
  accountName: string
}

// ---------------------------------------------------------------------------
// Machine Context & Events
// ---------------------------------------------------------------------------

export interface AppContext {
  // Device — persist → MMKV
  device: DeviceInfo | null

  // Auth — in-memory (accessToken ngắn hạn, silent refresh khi restart)
  accessToken: string | null
  employee: Employee | null

  // Shift — in-memory (re-fetch khi app start)
  cashSessionId: string | null

  // Config — persist → MMKV (cần cho offline mode)
  paymentMethods: PaymentMethodConfig[] | null
  tenantConfig: TenantConfig | null
  terminalConfig: TerminalConfig | null

  // Error
  error: string | null
}

export type AppEvent =
  | { type: 'DEVICE_ACTIVATED'; device: DeviceInfo }
  | {
      type: 'LOGIN_SUCCESS'
      accessToken: string
      employee: Employee
      device: DeviceInfo // refresh device.status từ login response
    }
  | { type: 'SHIFT_OPENED'; cashSessionId: string }
  | { type: 'SHIFT_CLOSED' }
  | { type: 'LOGGED_OUT' }
  | { type: 'TOKEN_EXPIRED' }
  | { type: 'DEVICE_RESET' } // xoá device, về DEVICE_INACTIVE
  | { type: 'DEVICE_UNLOCKED' } // thiết bị được kích hoạt lại từ server
  | { type: 'PAYMENT_METHODS_UPDATED'; paymentMethods: PaymentMethodConfig[] }
  /** Interceptor silent-refresh thành công → cập nhật accessToken mới vào context */
  | { type: 'ACCESS_TOKEN_REFRESHED'; accessToken: string }
  /** Network phục hồi sau khi app khởi động offline → revalidate với server */
  | { type: 'NETWORK_RESTORED' }

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

export interface AppStoreState {
  appService: ActorRefFrom<typeof appMachine> | null
  initApp: () => void
  destroyApp: () => void
}
