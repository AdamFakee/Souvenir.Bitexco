import { useMutation } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'

// 1. Types cục bộ cho endpoint
export interface GenerateQrCodeParams {
  bankCode?: string
  accountNo?: string
  accountName?: string
  amount: number
  description?: string
}

export interface GenerateQrCodePayload {
  paymentId: string
  params: GenerateQrCodeParams
}

export interface QrPaymentResponse {
  id: string
  paymentId: string
  qrUrl: string
  qrPayload: string
  expiresAt: string
}

export type GenerateQrCodeResponse = QrPaymentResponse

// 2. API Function
export const generateQrCode = async (
  paymentId: string,
  params: GenerateQrCodeParams,
): Promise<GenerateQrCodeResponse> => {
  const res = await AxiosService.getInstance().post<QrPaymentResponse>(
    `/v1/payments/${paymentId}/qr`,
    params,
  )
  return res.data
}

// 3. Custom Hook
export const useGenerateQrCode = () => {
  return useMutation({
    mutationFn: ({ paymentId, params }: GenerateQrCodePayload) => generateQrCode(paymentId, params),
  })
}
