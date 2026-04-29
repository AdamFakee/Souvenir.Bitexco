import { useAuthStore } from '@/shared/features/auth'
import { useRootNavigationState, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { ROUTES } from '../constants'

export const useAuthGuard = () => {
  const segments = useSegments()
  const router = useRouter()
  const rootNavigationState = useRootNavigationState()

  const { isShiftOpen } = useAuthStore()

  useEffect(() => {
    // Không làm gì nếu navigator chưa khởi tạo xong
    if (!rootNavigationState?.key) return

    const timeout = setTimeout(() => {
      const inAuthGroup = segments[0] === '(auth)'
      const inTabGroup = segments[0] === '(tab)'
      // const isOrderPath = segments[0] === 'order'
      // const isOrderingPath = segments[0] === 'ordering'
      // const isTablePath = segments[0] === 'table'
      // const isPaymentPath = segments[0] === 'payment'
      const currentPath = `/${segments.join('/')}`

      // ② Ca chưa mở → tự do trong (auth), chặn nếu lạc ra ngoài hoặc vào Tab
      if (!isShiftOpen) {
        if (!inAuthGroup) {
          router.replace(ROUTES.STAFF_LOGIN.path())
          return
        }
        return
      }

      // ③ Ca đã mở → bắt vào Tab POS nếu còn đứng ngoài
      if (!inTabGroup) {
        router.replace(ROUTES.POS.path())
      }
    }, 1)

    return () => clearTimeout(timeout)
  }, [isShiftOpen, segments, router, rootNavigationState?.key])
}
