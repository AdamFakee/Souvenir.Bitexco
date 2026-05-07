import { useAuthStore } from '@/shared/features/auth'
import { OrderLocalAPI } from '@/shared/features/order/api/local/order.local.api'
import { useCartStore } from '@/shared/features/pos/store'
import { PaymentMethod } from '@/shared/lib/database/models/payment'
import { toast } from '@/shared/store/use-alert-store'
import { useCallback, useRef } from 'react'
import { PaymentContext, PaymentPopupRef, PaymentResult } from '../types'
import { calculateVoucherDiscount } from '../utils'

import { PaymentRemoteAPI } from '../api/remote/payment.remote.api'

export function usePaymentFlow(context: PaymentContext) {
  const refs = useRef<Record<string, PaymentPopupRef | null>>({})
  const { removeCurrentCart, sessions } = useCartStore()
  const { session } = useAuthStore()

  // Hàm dùng chung cho MỌI payment method
  const handleCheckoutSuccess = useCallback(
    async (result: PaymentResult) => {
      const activeSession = context.sessionId ? sessions[context.sessionId] : null
      const appliedVoucher = activeSession?.appliedVoucher

      if (!activeSession) {
        toast.error('Lỗi: Không tìm thấy giỏ hàng hiện tại')
        return
      }

      const staffId = session?.staffId
      const shiftId = session?.shiftId
      if (!staffId || !shiftId) {
        toast.error('Lỗi: Không tìm thấy thông tin ca làm việc hoặc nhân viên')
        return
      }

      const checkoutPayload = {
        staffId,
        shiftId,
        items: context.items,
        subtotal: context.total + context.discount,
        discount: context.discount,
        voucherCode: appliedVoucher?.code,
        voucherDiscount: appliedVoucher
          ? calculateVoucherDiscount(context.items, appliedVoucher)
          : 0,
        total: context.total,
        note: activeSession?.note,
        payment: {
          method: result.method,
          amount: result.paidAmount,
          cashTendered: result.method === PaymentMethod.CASH ? result.paidAmount : 0,
          cashChange: result.method === PaymentMethod.CASH ? result.change : 0,
          referenceCode: result.referenceCode,
        },
      }

      try {
        if (result.isOnline) {
          if (!result.orderId) {
            throw new Error('Thanh toán Online thành công nhưng không có orderId từ Server')
          }

          // ONLINE: Chỉ trừ kho và cộng doanh thu ca, sau đó kéo data chuẩn từ server về lưu local
          await OrderLocalAPI.recordOnlineOrderSuccess(checkoutPayload)

          // Kéo dữ liệu Order, Items, Payments chuẩn từ Server về và lưu vào Local (đánh dấu Synced)
          PaymentRemoteAPI.getOrderSyncData(result.orderId)
            .then((syncData) => OrderLocalAPI.saveOrderSyncData(syncData))
            .catch((err) => console.error('Lỗi khi lưu dữ liệu đồng bộ đơn hàng:', err))
        } else {
          // OFFLINE (Cash/Card): Lưu full Order vào Local để Sync sau
          await OrderLocalAPI.checkout(checkoutPayload)
        }

        removeCurrentCart()
        toast.success(`Thanh toán thành công!`)
      } catch (err: any) {
        toast.error(err?.message ?? 'Lỗi khi lưu đơn hàng')
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, removeCurrentCart, sessions, session?.staffId],
  )

  const startPayment = useCallback((method: PaymentMethod) => {
    const popupRef = refs.current[method]
    if (popupRef) {
      popupRef.open()
    } else {
      toast.error('Phương thức thanh toán này chưa được hỗ trợ')
    }
  }, [])

  return { refs, startPayment, handleCheckoutSuccess }
}
