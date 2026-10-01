import { useMutation } from '@tanstack/react-query'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import type { VerifyVoucherPayload, VerifyVoucherResponse } from '@/features/payment/types'

// 1. API Function
export const verifyVoucher = async (
  payload: VerifyVoucherPayload,
): Promise<VerifyVoucherResponse> => {
  const normalizedCode = payload.code.trim().toUpperCase()

  try {
    const response = await AxiosService.getInstance().post<VerifyVoucherResponse>(
      '/v1/pos/vouchers/verify',
      { code: normalizedCode },
    )

    return response.data
  } catch (error: any) {
    const data = error?.response?.data
    const message = typeof data?.message === 'string' ? data.message : undefined

    throw new Error(
      message || error?.message || 'Không thể kiểm tra mã giảm giá. Vui lòng thử lại.',
    )
  }
}

export const useVerifyVoucher = () => {
  return useMutation({
    mutationFn: verifyVoucher,
  })
}
