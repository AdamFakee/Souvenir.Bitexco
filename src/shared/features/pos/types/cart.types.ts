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

/** Loại đối tượng được gắn vào phiên bán hàng */
export type AgentType = 'retail' | 'collaborator' | 'agent'

/** HDV / Cộng tác viên / Đại lý được gắn vào phiên */
export type Affiliate = {
  id: string
  code: string
  name: string
  phone: string
  isDebt: boolean
  /** Loại: collaborator (cộng tác viên) | agent (đại lý, được nợ) */
  agentType: AgentType
  creditLimit?: number | null
  representative?: string | null
  representativeTitle?: string | null
  companyName?: string | null
  isActive: boolean
}

export type AppliedVoucher = {
  code: string
  voucherType: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING' | 'BUY_X_GET_Y'
  discountValue: number
  minOrderValue: number | null
  maxDiscountAmount: number | null
  applicableVariantIds: string[] | null // Danh sách ID biến thể sản phẩm được áp dụng
}
