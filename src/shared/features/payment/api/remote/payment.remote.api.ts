import { PaymentMethodConfig } from '@/shared/features/app'
import { AxiosService } from '@/shared/lib/axios/axios.service'

export interface QrPaymentResponse {
  id: string
  paymentId: string
  qrUrl: string
  qrPayload: string
  expiresAt: string
}

export interface PaymentResponse {
  id: string
  code: string
  orderId: string
  method: string
  amount: number
  currency: string
  state: string
  provider?: string
  capturedAt?: string
  version: number
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
   * Sinh mã QR từ paymentId
   */
  generateQrCode: async (
    paymentId: string,
    params: {
      bankCode: string
      accountNo: string
      accountName: string
      amount: number
      description?: string
    },
  ): Promise<QrPaymentResponse> => {
    try {
      const res = await AxiosService.getInstance().post<QrPaymentResponse>(
        `/v1/payments/${paymentId}/qr`,
        params,
      )
      return res.data
    } catch (error) {
      throw error
    }
  },

  /**
   * Lấy trạng thái thanh toán của Payment
   */
  getPaymentStatus: async (paymentId: string): Promise<PaymentResponse> => {
    try {
      const res = await AxiosService.getInstance().get<PaymentResponse>(`/v1/payments/${paymentId}`)
      return res.data
    } catch (error) {
      throw error
    }
  },

  /**
   * Chuyển trạng thái Payment: process / authorize / capture / void / fail
   * POST /v1/payments/{id}/transitions
   */
  transitionPayment: async (
    paymentId: string,
    params: { action: string; expectedVersion: number; reason?: string },
  ): Promise<PaymentResponse> => {
    try {
      const res = await AxiosService.getInstance().post<PaymentResponse>(
        `/v1/payments/${paymentId}/transitions`,
        params,
      )
      return res.data
    } catch (error) {
      throw error
    }
  },

  /**
   * Ghi nhận thông tin thẻ từ EDC sau khi khách quẹt
   * POST /v1/payments/{id}/card-capture
   */
  cardCapture: async (
    paymentId: string,
    params: {
      terminalId: string
      merchantId: string
      maskedPan?: string
      authCode?: string
      rrn?: string
    },
  ): Promise<any> => {
    try {
      const res = await AxiosService.getInstance().post(
        `/v1/payments/${paymentId}/card-capture`,
        params,
      )
      return res.data
    } catch (error) {
      throw error
    }
  },
}
