import { AxiosService } from '@/shared/lib/axios/axios.service'
import { Affiliate } from '@/shared/types'

/**
 * Tra cứu danh sách HDV / Cộng tác viên (affiliate).
 */
export async function getAffiliatesRemote(params?: {
  q?: string
  limit?: number
  page?: number
  isActive?: boolean
  hasTransaction?: boolean
}): Promise<{ items: Affiliate[]; totalCount: number; page: number; pageSize: number }> {
  const response = await AxiosService.getInstance().get<any>('/v1/pos/affiliates', {
    params: {
      q: params?.q || undefined,
      limit: params?.limit || undefined,
      page: params?.page || undefined,
      isActive: params?.isActive !== undefined ? params.isActive : undefined,
      hasTransaction: params?.hasTransaction !== undefined ? params.hasTransaction : undefined,
    },
  })

  const resData = response.data
  const rawItems: any[] = Array.isArray(resData)
    ? resData
    : resData?.data?.items || resData?.items || resData?.data || []

  const items: Affiliate[] = rawItems.map((item: any) => ({
    id: String(item.id),
    code: String(item.code || ''),
    name: String(item.name || item.fullName || item.full_name || ''),
    phone: item.phone ? String(item.phone) : '',
    isDebt: Boolean(item.isDebt || item.allowCredit || item.allow_credit || false),
    agentType: 'collaborator' as const,
    isActive:
      item.isActive !== undefined
        ? Boolean(item.isActive)
        : Boolean(item.is_active ?? (item.state === 'ACTIVE' || true)),
  }))

  return {
    items,
    totalCount: resData?.totalCount || resData?.data?.totalCount || items.length,
    page: resData?.page || resData?.data?.page || params?.page || 0,
    pageSize: resData?.pageSize || resData?.data?.pageSize || params?.limit || 10,
  }
}
