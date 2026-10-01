export interface CashSession {
  id: string
  code: string
  posDeviceId: string
  cashierUserId: string
  state: 'OPEN' | 'CLOSING' | 'RECONCILING' | 'CLOSED'
  openedAt: string
  closedAt?: string | null
  openingCash: number
  countedCash?: number | null
  expectedCash?: number | null
  diffCash?: number | null
  notes?: string | null
  version: number
}
