import { AxiosService } from '@/shared/lib/axios/axios.service'
import { DashboardOverviewResponse, ProductRevenueResponse } from '../../types'

export const DashboardRemoteAPI = {
  /**
   * Lấy tổng quan báo cáo doanh thu ca (Aggregate)
   */
  fetchDashboardOverview: async (shiftId: string): Promise<DashboardOverviewResponse> => {
    const axios = AxiosService.getInstance()
    const response = await axios.get<DashboardOverviewResponse>('/v1/dashboard/overview', {
      params: { shiftId },
    })
    console.log('[DashboardRemoteAPI] overview response', response.data)
    return response.data
  },

  /**
   * Lấy chi tiết doanh thu theo sản phẩm (Tách biệt khỏi API chính để tối ưu hóa)
   */
  fetchProductRevenueReport: async (params: {
    shiftId: string
    page?: number
    limit?: number
  }): Promise<ProductRevenueResponse> => {
    const { shiftId, page = 0, limit = 10 } = params
    const axios = AxiosService.getInstance()
    const response = await axios.get<ProductRevenueResponse>('/v1/dashboard/product-revenue', {
      params: { shiftId, page, limit },
    })
    console.log('[DashboardRemoteAPI] product revenue response', response.data)
    return response.data
  },
}
