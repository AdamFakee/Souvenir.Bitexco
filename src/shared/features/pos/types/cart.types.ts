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
  percent: number
  maxDiscountAmount?: number
  applicableVariantIds?: string[] // Danh sách ID biến thể sản phẩm được áp dụng
}
