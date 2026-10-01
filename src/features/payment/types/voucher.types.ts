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
  percent?: number | null
}
