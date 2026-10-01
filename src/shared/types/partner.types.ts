export type AgentType = 'collaborator' | 'agent' | 'retail'

export interface Affiliate {
  id: string
  name: string
  code: string
  phone?: string | null
  agentType?: AgentType
  isDebt?: boolean
  creditLimit?: number | null
  remainingCredit?: number | null
  representative?: string | null
  representativeTitle?: string | null
  companyName?: string | null
  isActive?: boolean
}

export interface Partner {
  id: string
  code: string
  nameVi: string
  nameEn?: string | null
  companyName?: string
  taxId?: string | null
  address?: string | null
  representative?: string | null
  representativeTitle?: string | null
  phone?: string | null
  email?: string | null
  debtCode?: string | null
  sapCode?: string | null
  invoiceEmail?: string | null
  otherEmail?: string | null
  allowCredit?: boolean
  creditLimit?: number | null
  remainingCredit?: number | null
  isActive?: boolean
  version?: number
}
