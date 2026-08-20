import { OrderLocalAPI, OrderRemoteAPI } from '@/shared/features/order/api'
import { Partner } from '@/shared/features/order/types'
import { useConnectionStore } from '@/shared/store'
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
  remainingCredit: partner.remainingCredit,
  representative: partner.representative,
  representativeTitle: partner.representativeTitle,
  companyName: partner.companyName,
  isActive: partner.isActive,
})

export const useAffiliates = (params?: { q?: string; agentType?: AgentType; limit?: number }) => {
  const q = params?.q?.trim() || ''
  const agentType = params?.agentType

  return useQuery({
    queryKey: ['affiliates', agentType, q],
    queryFn: async (): Promise<Affiliate[]> => {
      const isNetworkConnected = useConnectionStore.getState().isNetworkConnected
      if (isNetworkConnected) {
        try {
          if (agentType === 'agent') {
            const res = await OrderRemoteAPI.getPartners({ search: q || undefined })
            return res.items.map(mapPartnerToAffiliate)
          }

          const res = await OrderRemoteAPI.getAffiliates({
            q: q || undefined,
            limit: params?.limit,
          })
          return res.items
        } catch (e) {
          console.warn('[useAffiliates] Online search failed, fallback to local', e)
        }
      }

      // Offline Fallback
      if (agentType === 'agent') {
        const localPartners = await OrderLocalAPI.searchPartners(q)
        return localPartners.map((p) =>
          mapPartnerToAffiliate({
            id: p.id,
            code: p.code,
            nameVi: p.nameVi,
            phone: p.phone,
            allowCredit: p.allowCredit,
            creditLimit: p.creditLimit || 0,
            remainingCredit: p.remainingCredit || 0,
            representative: p.representative,
            representativeTitle: p.representativeTitle,
            companyName: p.companyName,
            isActive: p.isActive,
          } as any),
        )
      }

      const localAffiliates = await OrderLocalAPI.searchAffiliates(q)
      return localAffiliates.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        phone: a.phone || '',
        isDebt: false,
        agentType: 'collaborator',
        creditLimit: 0,
        remainingCredit: 0,
        isActive: a.isActive,
      }))
    },
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
    networkMode: 'always', // Luôn chạy queryFn dù online hay offline để fallback local hoạt động
    enabled: true,
  })
}
