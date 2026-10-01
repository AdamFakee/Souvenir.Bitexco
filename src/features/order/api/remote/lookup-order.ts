import { AxiosService } from '@/shared/lib/axios/axios.service'

/**
 * Tra cứu đơn hàng bằng code để xem cấu trúc phản hồi từ backend.
 */
export async function lookupOrder(code: string): Promise<unknown> {
  const response = await AxiosService.getInstance().get<unknown>(`/v1/pos/orders/lookup`, {
    params: { code },
  })
  return response.data
}
