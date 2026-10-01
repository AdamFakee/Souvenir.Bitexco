import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'

// 1. Types cục bộ cho endpoint
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

export type GetPaymentStatusResponse = PaymentResponse

// 2. Query Key Factory
export const getPaymentStatusQueryKey = (paymentId?: string) =>
  ['payments', 'status', paymentId] as const

// 3. API Function
export const getPaymentStatus = async (paymentId: string): Promise<GetPaymentStatusResponse> => {
  const res = await AxiosService.getInstance().get<PaymentResponse>(`/v1/payments/${paymentId}`)
  return res.data
}

// 4. Custom Hook
export const useGetPaymentStatus = (
  paymentId: string,
  options?: Omit<UseQueryOptions<GetPaymentStatusResponse, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: getPaymentStatusQueryKey(paymentId),
    queryFn: () => getPaymentStatus(paymentId),
    enabled: Boolean(paymentId),
    ...options,
  })
}
