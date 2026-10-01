import { useConnectionStore } from '@/core/hardware'
import {
  getAffiliatesRemote,
  getPartnersRemote,
  searchAffiliatesLocal,
  searchPartnersLocal,
} from '@/features/order/api'
import { Affiliate, AgentType, Partner } from '@/shared/types'
import { useQuery } from '@tanstack/react-query'

const mapPartnerToAffiliate = (partner: Partner): Affiliate => ({
  id: partner.id,
  code: partner.code,
  name: partner.nameVi,
  phone: partner.phone ?? '',
  isDebt: partner.allowCredit ?? false,
  agentType: 'agent',
  creditLimit: partner.creditLimit,
  remainingCredit: partner.remainingCredit,
  representative: partner.representative,
  representativeTitle: partner.representativeTitle,
  companyName: partner.companyName,
  isActive: partner.isActive ?? true,
})

export const useAffiliates = (params?: {
  q?: string
  agentType?: AgentType
  limit?: number
  hasTransaction?: boolean
  isActive?: boolean
}) => {
  const q = params?.q?.trim() || ''
  const agentType = params?.agentType
  const hasTransaction = params?.hasTransaction
  const isActive = params?.isActive

  return useQuery({
    queryKey: ['affiliates', agentType, q, hasTransaction, isActive],
    queryFn: async (): Promise<Affiliate[]> => {
      const isNetworkConnected = useConnectionStore.getState().isNetworkConnected
      if (isNetworkConnected) {
        try {
          if (agentType === 'agent') {
            const res = await getPartnersRemote({
              search: q || undefined,
              limit: params?.limit,
              hasTransaction,
              isActive,
            })
            return res.items.map(mapPartnerToAffiliate)
          }

          const res = await getAffiliatesRemote({
            q: q || undefined,
            limit: params?.limit,
            hasTransaction,
            isActive,
          })
          return res.items.map((item) => ({
            ...item,
            phone: item.phone ?? '',
            isDebt: item.isDebt ?? false,
            agentType: item.agentType ?? 'collaborator',
            isActive: item.isActive ?? true,
          }))
        } catch (e) {
          console.warn('[useAffiliates] Online search failed, fallback to local', e)
        }
      }

      // Offline Fallback
      if (agentType === 'agent') {
        let localPartners = await searchPartnersLocal(q)
        if (isActive !== undefined) {
          localPartners = localPartners.filter((p) => Boolean(p.isActive) === isActive)
        }
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

      let localAffiliates = await searchAffiliatesLocal(q)
      if (isActive !== undefined) {
        localAffiliates = localAffiliates.filter((a) => Boolean(a.isActive) === isActive)
      }
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
