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
