export type VerifyVoucherPayload = {
  code: string
  subtotal: number
}

export type VerifyVoucherResponse = {
  code: string
  percent: number // 0-100
  maxDiscountAmount?: number // limit
}

export const remoteVoucherApi = {
  verify: async (payload: VerifyVoucherPayload): Promise<VerifyVoucherResponse> => {
    // Mock API delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const normalizedCode = payload.code.trim().toUpperCase()

    // Mock data
    if (normalizedCode === '10') {
      return {
        code: normalizedCode,
        percent: 10,
      }
    }

    if (normalizedCode === '50') {
      return {
        code: normalizedCode,
        percent: 50,
        maxDiscountAmount: 50000,
      }
    }

    throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn')
  },
}
