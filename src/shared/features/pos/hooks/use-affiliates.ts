import { OrderRemoteAPI } from '@/shared/features/order/api'
import { Partner } from '@/shared/features/order/types'
import { useQuery } from '@tanstack/react-query'
import { Affiliate, AgentType } from '../types/cart.types'

const mapPartnerToAffiliate = (partner: Partner): Affiliate => ({
  id: partner.id,
  code: partner.code,
  name: partner.nameVi,
  phone: partner.phone ?? '',
  isDebt: partner.allowCredit,
  agentType: 'agent',
  creditLimit: partner.creditLimit,
  representative: partner.representative,
  representativeTitle: partner.representativeTitle,
  companyName: partner.companyName,
  isActive: partner.isActive,
})

export const useAffiliates = (params?: { q?: string; agentType?: AgentType; limit?: number }) => {
  const q = params?.q?.trim() || ''
  const agentType = params?.agentType

  return useQuery({
    queryKey: ['affiliates', q, agentType],
    queryFn: async (): Promise<Affiliate[]> => {
      if (agentType === 'agent') {
        const res = await OrderRemoteAPI.getPartners({ search: q || undefined })
        return res.items.map(mapPartnerToAffiliate)
      }

      const res = await OrderRemoteAPI.getAffiliates({ q: q || undefined, limit: params?.limit })
      return res.items
    },
    staleTime: 0, // 5 phút cache
    enabled: true,
  })
}
