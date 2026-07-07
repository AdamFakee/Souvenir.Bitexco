import { AxiosService } from '@/shared/lib/axios/axios.service'

export type VerifyVoucherPayload = {
  code: string
}

export type VerifyVoucherResponse = {
  code: string
  voucherType: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING' | 'BUY_X_GET_Y'
  discountValue: number
  minOrderValue: number | null
  maxDiscountAmount: number | null
  applicableVariantIds: string[] | null
}

export const remoteVoucherApi = {
  verify: async (payload: VerifyVoucherPayload): Promise<VerifyVoucherResponse> => {
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
  },
}
