import { useMutation } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { PaymentResponse } from './get-payment-status'

// 1. Types cục bộ cho endpoint
export interface TransitionPaymentParams {
  action: string
  expectedVersion: number
  reason?: string
}

export interface TransitionPaymentPayload {
  paymentId: string
  params: TransitionPaymentParams
}

export type TransitionPaymentResponse = PaymentResponse

// 2. API Function
export const transitionPayment = async (
  paymentId: string,
  params: TransitionPaymentParams,
): Promise<TransitionPaymentResponse> => {
  const res = await AxiosService.getInstance().post<PaymentResponse>(
    `/v1/payments/${paymentId}/transitions`,
    params,
  )
  return res.data
}

// 3. Custom Hook
export const useTransitionPayment = () => {
  return useMutation({
    mutationFn: ({ paymentId, params }: TransitionPaymentPayload) =>
      transitionPayment(paymentId, params),
  })
}
