export type CartProduct = {
  id: string
  name: string
  price: number
  sku: string
  unit: string
  unitId: string
  taxRate: number
  image?: string | null
  stock?: number | null
  priceStatus?: string
}

export type CartItem = {
  id: string // product id
  product: CartProduct
  quantity: number
  price: number // price at the time of adding
  discountAmount?: number
}

export type AppliedVoucher = {
  code: string
  voucherType: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING' | 'BUY_X_GET_Y'
  discountValue: number
  minOrderValue: number | null
  maxDiscountAmount: number | null
  applicableVariantIds: string[] | null
  percent?: number | null
}
