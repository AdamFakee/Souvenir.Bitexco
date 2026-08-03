export interface PaymentMethodItem {
  name?: string
  value?: number
  method?: string
  amount?: number
}

export interface ProductRevenueItem {
  name: string
  qty: number
  price: number
  total: number
}

export interface DashboardOverviewResponse {
  employeeName: string
  employeeCode: string
  shiftTime: string
  shiftStart: string
  totalRevenue: number
  totalOrders: number
  completedOrders: number
  refundedOrders: number
  totalProductsSold: number
  paymentMethods: PaymentMethodItem[]
}

export interface ProductRevenueResponse {
  items: ProductRevenueItem[]
  totalCount: number
  page: number
  pageSize: number
  totalItems?: number
  totalRevenue?: number
}
