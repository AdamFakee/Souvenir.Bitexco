import type { CartItem } from '@/shared/features/pos/store/use-cart-store'

export interface CreateOrderResponse {
  /** ID đơn hàng do Backend tạo ra */
  orderId: string
}

export interface GetQrResponse {
  /** Số hóa đơn do Backend sinh ra (dùng cho đối soát) */
  billNumber: string
  /** Chuỗi nội dung để render QR Code */
  qrContent: string
}

export interface VerifyPaymentResponse {
  /** Trạng thái đã thanh toán hay chưa */
  isPaid: boolean
}

/**
 * Remote API cho luồng thanh toán QR Code.
 * Hiện tại là Mock, sẽ thay bằng Real API khi Backend cung cấp endpoint.
 */
export const PaymentRemoteAPI = {
  /**
   * Tạo Order và trả về orderId.
   */
  createOrder: async (payload: {
    items: CartItem[]
    total: number
    discount: number
    voucherCode?: string
    staffId: string
    shiftId: string
  }): Promise<CreateOrderResponse> => {
    // --- MOCK: Giả lập delay mạng 1 giây ---
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const mockOrderId = `BE_QR_${Date.now()}`
    return { orderId: mockOrderId }
    // --- END MOCK ---
  },

  /**
   * Lấy nội dung mã QR dựa vào orderId.
   */
  getQrCode: async (orderId: string): Promise<GetQrResponse> => {
    // --- MOCK: Giả lập delay mạng 0.5 giây ---
    await new Promise((resolve) => setTimeout(resolve, 500))
    const billNumber = `BILL_${Date.now()}`
    const qrContent = `https://payment.mock/qr/${orderId}?bill=${billNumber}`
    return { billNumber, qrContent }
    // --- END MOCK ---
  },

  /**
   * Xác thực trạng thái thanh toán (Polling).
   */
  _mockCounts: new Map<string, number>(),
  verifyPaymentTransaction: async (orderId: string): Promise<VerifyPaymentResponse> => {
    // --- MOCK: Giả lập delay mỗi lần poll 800ms ---
    await new Promise((resolve) => setTimeout(resolve, 800))

    const currentCount = PaymentRemoteAPI._mockCounts.get(orderId) || 0
    const nextCount = currentCount + 1
    PaymentRemoteAPI._mockCounts.set(orderId, nextCount)

    const isPaid = nextCount >= 4
    if (isPaid) PaymentRemoteAPI._mockCounts.delete(orderId) // Dọn dẹp

    return { isPaid }
    // --- END MOCK ---
  },
}
