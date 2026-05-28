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
      console.warn('generateQrCode API failed, falling back to mock:', error)
      // Fallback to mock in case server lacks this endpoint
      await new Promise((resolve) => setTimeout(resolve, 500))
      return {
        id: `qr_${paymentId}`,
        paymentId,
        qrUrl: `https://payment.mock/qr/${paymentId}?amount=${params.amount}`,
        qrPayload: `00020101021238580010A00000072701240006970415011012345678900208QRPAYMENT53037045406${params.amount}5802VN5909CONGTYABC6005HANOI62190815Thanh toan don6304`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }
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
      console.warn('getPaymentStatus API failed, falling back to mock:', error)
      // Fallback to mock: auto capture after a delay
      await new Promise((resolve) => setTimeout(resolve, 800))
      return {
        id: paymentId,
        code: `PAY_${paymentId}`,
        orderId: 'mock_order_id',
        method: 'qr_bidv',
        amount: 100000,
        currency: 'VND',
        state: Math.random() > 0.4 ? 'CAPTURED' : 'INITIATED',
        version: 1,
      }
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
      console.warn(`[PaymentRemoteAPI] transitionPayment(${params.action}) fallback mock:`, error)
      await new Promise((resolve) => setTimeout(resolve, 200))
      const stateMap: Record<string, string> = {
        process: 'PROCESSING',
        authorize: 'AUTHORIZED',
        capture: 'CAPTURED',
        fail: 'FAILED',
        void: 'VOIDED',
      }
      return {
        id: paymentId,
        code: `PAY_${paymentId}`,
        orderId: 'mock_order_id',
        method: 'card_bidv',
        amount: 0,
        currency: 'VND',
        state: stateMap[params.action] ?? 'UNKNOWN',
        version: params.expectedVersion + 1,
      }
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
      console.warn('[PaymentRemoteAPI] cardCapture fallback mock:', error)
      await new Promise((resolve) => setTimeout(resolve, 200))
      return {
        id: `card_${paymentId}`,
        paymentId,
        ...params,
        responseCode: '00',
        capturedAt: new Date().toISOString(),
      }
    }
  },
}
