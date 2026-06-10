import { PaymentMethodConfig, PaymentMethodCode } from '@/shared/features/app'
import { AxiosService } from '@/shared/lib/axios/axios.service'

const ALLOWED_PAYMENT_METHOD_CODES: PaymentMethodCode[] = ['cash', 'qr_bidv', 'card_bidv']

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
  getPaymentMethods: async (): Promise<PaymentMethodConfig[]> => {
    try {
      const res = await AxiosService.getInstance().get<PaymentMethodConfig[]>('/v1/payment-methods')
      return res.data.filter(
        (method) => method.enabled && ALLOWED_PAYMENT_METHOD_CODES.includes(method.code),
      )
    } catch (error) {
      console.error('[PaymentRemoteAPI] getPaymentMethods failed:', error)
      throw error
    }
  },

  /**
   * Sinh mã QR từ paymentId
   */
  generateQrCode: async (
    paymentId: string,
    params: {
      bankCode?: string
      accountNo?: string
      accountName?: string
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
