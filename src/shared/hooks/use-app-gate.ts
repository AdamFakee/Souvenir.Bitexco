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
 * - noShift         → redirect /open-shift
 * - shiftOpen       → cho phép (tab) + /exchange; ngoài ra redirect /pos
 */
export const useAppGate = () => {
  const appService = useAppStore((s) => s.appService)
  const stateValue = useSelector(appService ?? undefined, (s) => s?.value)
  const router = useRouter()
  const segments = useSegments()
  const rootNavigationState = useRootNavigationState()

  // Destructure primitive values to avoid referencing a new array on every render
  const segment0 = segments[0]
  const segment1 = segments[1]

  useEffect(() => {
    if (!rootNavigationState?.key) return
    if (!appService) return

    const inTabGroup = segment0 === '(tab)'
    const inExchange = segment0 === 'exchange'

    switch (stateValue) {
      case 'deviceInactive':
        if (segment1 !== 'device-activation') router.replace(ROUTES.DEVICE_ACTIVATION.path())
        break
      case 'deviceLockedByServer':
        if (segment1 !== 'device-locked') router.replace(ROUTES.DEVICE_LOCKED.path())
        break
      case 'unauthenticated':
        if (segment1 !== 'staff-login') router.replace(ROUTES.STAFF_LOGIN.path())
        break
      case 'noShift':
        if (segment1 !== 'open-shift') router.replace(ROUTES.OPEN_SHIFT.path())
        break
      case 'shiftOpen':
        // Tab POS + màn exchange full-screen; không kick về POS khi đang đổi hàng
        if (!inTabGroup && !inExchange) router.replace(ROUTES.POS.path())
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateValue, segment0, segment1, appService, rootNavigationState?.key])
}
