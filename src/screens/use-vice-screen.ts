import { calculateVoucherDiscount } from '@/shared/features/payment'
import { usePosStore } from '@/shared/features/pos'
import { CartItem } from '@/shared/features/pos/types/cart.types'
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
    const posService = usePosStore.getState().posService
    if (!posService) return

    const unsubscribe = posService.subscribe((state) => {
      const { activeCartId, carts } = state.context
      const activeCartActor = activeCartId ? carts[activeCartId] : null

      if (!activeCartActor) {
        ViceService.updateCart({ items: [], subtotal: 0, discount: 0, tax: 0, total: 0 })
        ViceService.setOrderId('')
        return
      }

      const cartSnapshot = activeCartActor.getSnapshot()
      const { items: cartItemsMap, appliedVoucher, label } = cartSnapshot.context
      const cartItems = Object.values(cartItemsMap) as CartItem[]

      // Chuyển đổi dữ liệu sang định dạng màn hình phụ mong đợi
      const items = cartItems.map((cartItem: CartItem) => ({
        id: cartItem.id,
        name: cartItem.product.name,
        price: cartItem.price,
        quantity: cartItem.quantity,
      }))

      const subtotal = cartItems.reduce(
        (sum: number, item: any) => sum + item.product.price * item.quantity,
        0,
      )
      const discount = calculateVoucherDiscount(cartItems, appliedVoucher || null)
      const tax = cartItems.reduce(
        (sum: number, item: any) =>
          sum + item.product.price * (item.product.taxRate / 100) * item.quantity,
        0,
      )
      const total = Math.max(0, subtotal - discount) + tax

      // Gửi sự kiện cập nhật
      ViceService.updateCart({ items, subtotal, discount, tax, total })
      ViceService.setOrderId(label)
    })

    return () => unsubscribe.unsubscribe()
  }, [])
}
