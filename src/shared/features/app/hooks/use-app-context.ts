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
  terminalConfig: null,
  error: null,
}

/**
 * Đọc toàn bộ context của appMachine.
 * ⚠️ Gây re-render khi BẤT KỲ field nào thay đổi.
 * Dùng selectors cụ thể bên dưới để tránh re-render dư thừa.
 *
 * @example
 * const { device, employee, paymentMethods } = useAppContext()
 */
export const useAppContext = (): AppContext => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s) => s?.context) ?? DEFAULT_CONTEXT
}

/** Chỉ subscribe vào device */
export const useDevice = (): AppContext['device'] => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s) => s?.context?.device ?? null)
}

/** Chỉ subscribe vào employee */
export const useEmployee = (): AppContext['employee'] => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s) => s?.context?.employee ?? null)
}

/** Chỉ subscribe vào cashSessionId */
export const useCashSessionId = (): AppContext['cashSessionId'] => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s) => s?.context?.cashSessionId ?? null)
}

/** Chỉ subscribe vào paymentMethods */
export const usePaymentMethods = (): AppContext['paymentMethods'] => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s) => s?.context?.paymentMethods ?? null)
}

/** Chỉ subscribe vào tenantConfig */
export const useTenantConfig = (): AppContext['tenantConfig'] => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s) => s?.context?.tenantConfig ?? null)
}

/** Chỉ subscribe vào terminalConfig */
export const useTerminalConfig = (): AppContext['terminalConfig'] => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s) => s?.context?.terminalConfig ?? null)
}

/** Chỉ subscribe vào accessToken */
export const useAccessToken = (): AppContext['accessToken'] => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s) => s?.context?.accessToken ?? null)
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
