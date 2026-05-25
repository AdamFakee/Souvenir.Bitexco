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
    // Mock API delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const normalizedCode = payload.code.trim().toUpperCase()

    // Mock data
    if (normalizedCode === '20') {
      return {
        code: normalizedCode,
        percent: 20,
        maxDiscountAmount: 50000,
        applicableVariantIds: [
          'prod_1',
          'prod_2',
          'prod_3',
          'prod_4',
          'prod_5',
          'prod_6',
          'prod_7',
          'prod_8',
          'prod_9',
          'prod_10',
        ],
      }
    }

    if (normalizedCode === '10') {
      return {
        code: normalizedCode,
        percent: 10,
        maxDiscountAmount: 100000,
        applicableVariantIds: [],
      }
    }

    if (normalizedCode === '50') {
      return {
        code: normalizedCode,
        percent: 50,
        maxDiscountAmount: 50000,
        applicableVariantIds: [],
      }
    }

    throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn')
  },
}
