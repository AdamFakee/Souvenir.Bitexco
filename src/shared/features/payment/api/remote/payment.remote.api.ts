import { PaymentMethodConfig } from '@/shared/features/app'

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
 */
export const PaymentRemoteAPI = {
  /**
   * Lấy cấu hình các phương thức thanh toán khả dụng từ server (hoặc mock v1.8).
   */
  getPaymentMethods: async (): Promise<PaymentMethodConfig[]> => {
    // --- MOCK: Giả lập delay mạng 0.3 giây ---
    await new Promise((resolve) => setTimeout(resolve, 300))
    return [
      {
        code: 'cash',
        name: 'Tiền mặt',
        icon: 'banknote',
        enabled: true,
        provider: null,
        settlementDays: 0,
        displayOrder: 1,
        isDefault: true,
      },
      {
        code: 'qr_bidv',
        name: 'VietQR BIDV',
        icon: 'qr-code',
        enabled: true,
        provider: 'bidv',
        settlementDays: 1,
        displayOrder: 2,
        isDefault: true,
      },
      {
        code: 'card_bidv',
        name: 'Thẻ BIDV',
        icon: 'credit-card',
        enabled: true,
        provider: 'card-bidv',
        settlementDays: 1,
        displayOrder: 4,
        isDefault: true,
      },
    ]
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
  verifyPaymentTransaction: async (orderId: string): Promise<VerifyPaymentResponse> => {
    await new Promise((resolve) => setTimeout(resolve, 800 * 3))
    return { isPaid: Math.random() > 0.5 }
  },
}
