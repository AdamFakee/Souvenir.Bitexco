import { AxiosService } from '@/shared/lib/axios/axios.service'

export type VerifyVoucherPayload = {
  code: string
}

export type VerifyVoucherResponse = {
  code: string
  percent: number // 0-100
  maxDiscountAmount?: number // limit
  applicableVariantIds?: string[] // Danh sách ID biến thể sản phẩm được áp dụng
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
