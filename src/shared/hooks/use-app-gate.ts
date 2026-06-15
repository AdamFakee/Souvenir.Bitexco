import { useSelector } from '@xstate/react'
import { useRootNavigationState, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { ROUTES } from '../constants'
import { useAppStore } from '../features/app/store/use-app-store'

/**
 * Root navigation guard dựa trên appMachine state.
 * Thay thế cho useAuthGuard.
 *
 * Logic:
 * - deviceInactive  → redirect /device-activation
 * - unauthenticated → redirect /staff-login
 * - noShift         → redirect /open-shift (nếu đang ở ngoài auth group)
 * - shiftOpen       → redirect /pos (chỉ khi đang ở ngoài tab group)
 *   Khi đã vào tab, user tự do navigate giữa pos/orders/dashboard/shift.
 */
export const useAppGate = () => {
  const appService = useAppStore((s) => s.appService)
  const stateValue = useSelector(appService ?? undefined, (s) => s?.value)
  const router = useRouter()
  const segments = useSegments()
  const rootNavigationState = useRootNavigationState()

  useEffect(() => {
    if (!rootNavigationState?.key) return
    if (!appService) return

    const currentRoute = segments[1] // 'pos', 'open-shift', 'staff-login', etc.
    const inTabGroup = segments[0] === '(tab)'

    switch (stateValue) {
      case 'deviceInactive':
        if (currentRoute !== 'device-activation') router.replace(ROUTES.DEVICE_ACTIVATION.path())
        break
      case 'deviceLockedByServer':
        if (currentRoute !== 'device-locked') router.replace(ROUTES.DEVICE_LOCKED.path())
        break
      case 'unauthenticated':
        if (currentRoute !== 'staff-login') router.replace(ROUTES.STAFF_LOGIN.path())
        break
      case 'noShift':
        if (currentRoute !== 'open-shift') router.replace(ROUTES.OPEN_SHIFT.path())
        break
      case 'shiftOpen':
        // Chỉ redirect vào tab khi đang ở ngoài — không can thiệp navigation trong tab
        if (!inTabGroup) router.replace(ROUTES.POS.path())
        break
    }
  }, [stateValue, segments, rootNavigationState?.key, appService])
}
