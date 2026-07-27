import { AxiosService } from '@/shared/lib/axios/axios.service'
import { DashboardOverviewResponse, ProductRevenueResponse } from '../../types'

const DASHBOARD_TIMEOUT_MS = 12_000

export const DashboardRemoteAPI = {
  /**
   * Lấy tổng quan báo cáo doanh thu ca (Aggregate)
   */
  fetchDashboardOverview: async (
    shiftId: string,
    staffId?: string | null,
  ): Promise<DashboardOverviewResponse> => {
    const axios = AxiosService.getInstance()
    const params: Record<string, string> = { shiftId }
    if (staffId) params.staffId = staffId
    const response = await axios.get<DashboardOverviewResponse>('/v1/pos/dashboard/overview', {
      params,
      timeout: DASHBOARD_TIMEOUT_MS,
    })
    console.log('fetchDashboardOverview', response.data)
    return response.data
  },

  /**
   * Lấy chi tiết doanh thu theo sản phẩm (Tách biệt khỏi API chính để tối ưu hóa)
   */
  fetchProductRevenueReport: async (params: {
    shiftId: string
    page?: number
    limit?: number
    staffId?: string | null
  }): Promise<ProductRevenueResponse> => {
    const { shiftId, page = 0, limit = 10, staffId } = params
    const axios = AxiosService.getInstance()
    const queryParams: Record<string, string | number> = { shiftId, page, limit }
    if (staffId) queryParams.staffId = staffId
    const response = await axios.get<ProductRevenueResponse>('/v1/pos/dashboard/product-revenue', {
      params: queryParams,
      timeout: DASHBOARD_TIMEOUT_MS,
    })
    console.log('fetchProductRevenueReport', response.data)
    return response.data
  },
}
