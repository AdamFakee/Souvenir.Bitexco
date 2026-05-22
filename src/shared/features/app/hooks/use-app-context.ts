import { useSelector } from '@xstate/react'
import { useAppStore } from '../store/use-app-store'
import type { AppContext, EmployeePermission } from '../types/app.types'

const DEFAULT_CONTEXT: AppContext = {
  device: null,
  accessToken: null,
  employee: null,
  cashSessionId: null,
  paymentMethods: [],
  tenantConfig: null,
  error: null,
}

/**
 * Đọc toàn bộ context của appMachine.
 * Thay thế cho useAuthStore và useGlobalConfigStore.
 *
 * @example
 * const { device, employee, paymentMethods } = useAppContext()
 */
export const useAppContext = (): AppContext => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s) => s?.context) ?? DEFAULT_CONTEXT
}

/**
 * Kiểm tra nhân viên có quyền nhất định không.
 *
 * @example
 * const canRefund = useHasPermission(EmployeePermission.REFUND)
 */
export const useHasPermission = (permission: EmployeePermission): boolean => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(
    appService ?? undefined,
    (s) => s?.context?.employee?.permissions.includes(permission) ?? false,
  )
}
