import { DashboardOverviewResponse, ProductRevenueItem } from '../../types'

export const DashboardRemoteAPI = {
  /**
   * Lấy tổng quan báo cáo doanh thu ca (Aggregate)
   */
  fetchDashboardOverview: async (shiftId?: string): Promise<DashboardOverviewResponse> => {
    console.log('[DashboardRemoteAPI] Fetching dashboard overview...', { shiftId })
    // In production, uncomment to call:
    // const axios = AxiosService.getInstance()
    // const response = await axios.get<DashboardOverviewResponse>('/v1/dashboard/overview', { params: { shiftId } })
    // return response.data

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          employeeName: 'Quốc Hoàng',
          employeeCode: '129129',
          shiftTime: '06:00-14:00',
          shiftStart: '06:00',
          totalRevenue: 94507777000,
          completedOrders: 120,
          totalProductsSold: 249,
          cancelledOrders: 12,
          paymentMethods: [
            { name: 'Thẻ tín dụng', value: 3450000 },
            { name: 'Tiền mặt', value: 3000000 },
            { name: 'QR', value: 3000000 },
          ],
        })
      }, 100)
    })
  },

  /**
   * Lấy chi tiết doanh thu theo sản phẩm (Tách biệt khỏi API chính để tối ưu hóa)
   */
  fetchProductRevenueReport: async (params?: {
    shiftId?: string
    page?: number
    limit?: number
  }): Promise<ProductRevenueItem[]> => {
    const { shiftId, page = 0, limit = 10 } = params || {}
    console.log('[DashboardRemoteAPI] Fetching product revenue report separately...', {
      shiftId,
      page,
      limit,
    })
    // In production, uncomment to call:
    // const axios = AxiosService.getInstance()
    // const response = await axios.get<ProductRevenueItem[]>('/v1/dashboard/product-revenue', { params: { shiftId, page, limit } })
    // return response.data

    return new Promise((resolve) => {
      setTimeout(() => {
        const allItems = [
          { name: 'Cà phê sữa đá', qty: 120, price: 35000, total: 4200000 },
          { name: 'Trà đào cam sả', qty: 75, price: 40000, total: 3000000 },
          { name: 'Bánh mì Việt Nam', qty: 45, price: 50000, total: 2250000 },
          { name: 'Bạc xỉu', qty: 38, price: 39000, total: 1482000 },
          { name: 'Trà sữa Trân châu', qty: 35, price: 45000, total: 1575000 },
          { name: 'Cà phê đen đá', qty: 30, price: 29000, total: 870000 },
          { name: 'Sinh tố xoài', qty: 25, price: 49000, total: 1225000 },
          { name: 'Nước cam vắt', qty: 22, price: 42000, total: 924000 },
          { name: 'Trà vải lài', qty: 20, price: 40000, total: 800000 },
          { name: 'Cà phê cốt dừa', qty: 18, price: 45000, total: 810000 },
          { name: 'Trà xanh Nhật Bản', qty: 15, price: 35000, total: 525000 },
          { name: 'Bánh sừng bò', qty: 14, price: 30000, total: 420000 },
          { name: 'Bánh tiramisu', qty: 12, price: 45000, total: 540000 },
          { name: 'Trà oolong sen', qty: 10, price: 42000, total: 420000 },
          { name: 'Sinh tố bơ', qty: 8, price: 52000, total: 416000 },
          { name: 'Nước ép dưa hấu', qty: 7, price: 39000, total: 273000 },
          { name: 'Bánh quy bơ', qty: 6, price: 25000, total: 150000 },
          { name: 'Trà chanh leo', qty: 5, price: 35000, total: 175000 },
          { name: 'Sữa chua dâu tây', qty: 4, price: 45000, total: 180000 },
          { name: 'Kem vani hạt dẻ', qty: 3, price: 49000, total: 147000 },
        ]
        const startIndex = page * limit
        const sliced = allItems.slice(startIndex, startIndex + limit)
        resolve(sliced)
      }, 150)
    })
  },
}
