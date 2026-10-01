import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import type { PaymentMethodCode, PaymentMethodConfig } from '@/features/app'
import { AxiosService } from '@/shared/lib/axios/axios.service'

const ALLOWED_PAYMENT_METHOD_CODES: PaymentMethodCode[] = ['cash', 'qr_bidv', 'card_bidv']

// 1. Response Type
export type GetPaymentMethodsResponse = PaymentMethodConfig[]

// 2. Query Key Factory
export const getPaymentMethodsQueryKey = () => ['payment-methods'] as const

// 3. API Function
export const getPaymentMethods = async (): Promise<GetPaymentMethodsResponse> => {
  const res = await AxiosService.getInstance().get<PaymentMethodConfig[]>('/v1/payment-methods')
  return res.data.filter((method) => ALLOWED_PAYMENT_METHOD_CODES.includes(method.code))
}

// 4. Custom Hook
export const useGetPaymentMethods = (
  options?: Omit<UseQueryOptions<GetPaymentMethodsResponse, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: getPaymentMethodsQueryKey(),
    queryFn: getPaymentMethods,
    ...options,
  })
}
