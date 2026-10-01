import { useMutation } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'

// 1. Types cục bộ cho endpoint
export interface CardCaptureParams {
  terminalId: string
  merchantId: string
  maskedPan?: string
  authCode?: string
  rrn?: string
}

export interface CardCapturePayload {
  paymentId: string
  params: CardCaptureParams
}

export type CardCaptureResponse = any

// 2. API Function
export const cardCapture = async (
  paymentId: string,
  params: CardCaptureParams,
): Promise<CardCaptureResponse> => {
  const res = await AxiosService.getInstance().post(
    `/v1/payments/${paymentId}/card-capture`,
    params,
  )
  return res.data
}

// 3. Custom Hook
export const useCardCapture = () => {
  return useMutation({
    mutationFn: ({ paymentId, params }: CardCapturePayload) => cardCapture(paymentId, params),
  })
}
