import { useCartStore } from '@/shared/features/pos'
import { toast } from '@/shared/store'
import { useEffect } from 'react'
import { InteractionManager } from 'react-native'
import IminViceScreen from '../../modules/imin-vice-screen'
import { ViceService } from './vice-service'

/**
 * Hook tổng hợp để khởi tạo màn hình phụ và tự động đồng bộ giỏ hàng
 */
export const useViceScreen = () => {
  // 1. Khởi tạo màn hình phụ (Kiểm tra phần cứng, quyền và mở view)
  useEffect(() => {
    const initViceScreen = () => {
      try {
        const supported = IminViceScreen.isSupportDoubleScreen()
        if (!supported) return

        const hasPermission = IminViceScreen.checkOverlayPermission()
        if (!hasPermission) {
          toast.info(
            'Vui lòng cấp quyền hiển thị trên ứng dụng khác để sử dụng màn hình phụ',
            'Yêu cầu quyền',
          )
          IminViceScreen.requestOverlayPermission()
          return
        }

        IminViceScreen.open('ViceScreen')
      } catch (err) {
        console.error('Vice Screen init failed:', err)
        toast.error('Không thể khởi tạo màn hình phụ!', 'Lỗi khởi tạo')
      }
    }

    const timer = InteractionManager.runAfterInteractions(() => {
      initViceScreen()
    })

    return () => timer.cancel()
  }, [])

  // 2. Đồng bộ giỏ hàng từ POS sang Vice Screen tự động
  useEffect(() => {
    const unsubscribe = useCartStore.subscribe((state) => {
      const sessionId = state.activeSessionId
      const session = sessionId ? state.sessions[sessionId] : null

      if (!session) {
        ViceService.updateCart({ items: [], total: 0 })
        ViceService.setOrderId('')
        return
      }

      // Chuyển đổi dữ liệu sang định dạng màn hình phụ mong đợi
      const items = Object.values(session.items).map((cartItem) => ({
        id: cartItem.id,
        name: cartItem.product.nameEn,
        price: cartItem.price,
        quantity: cartItem.quantity,
        image: cartItem.product.image ?? undefined,
      }))

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const discount = session.discount ?? 0
      const total = Math.max(0, subtotal - discount)

      // Gửi sự kiện cập nhật
      ViceService.updateCart({ items, total })
      ViceService.setOrderId(session.name)
    })

    return () => unsubscribe()
  }, [])
}
