export type CartProduct = {
  id: string
  nameEn: string
  nameVi: string
  price: number
  sku: string
  unit: string
  taxRate: number
  image?: string | null
  stock?: number | null
}

export type CartItem = {
  id: string // product id
  product: CartProduct
  quantity: number
  price: number // price at the time of adding
}

export type AppliedVoucher = {
  code: string
  percent: number
  maxDiscountAmount?: number
  applicableProductIds?: string[] // Danh sách ID sản phẩm được áp dụng
}
