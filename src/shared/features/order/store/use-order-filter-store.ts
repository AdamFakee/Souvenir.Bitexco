import { OrderStatus } from '@/shared/lib/database/models/order'
import { create } from 'zustand'

interface OrderFilterState {
  searchQuery: string
  status: string[] | string | null
  dateFrom: Date | null
  dateTo: Date | null
  scope: 'ALL' | 'SHIFT'

  setSearchQuery: (query: string) => void
  setStatus: (status: string[] | string | null) => void
  setDateFrom: (date: Date | null) => void
  setDateTo: (date: Date | null) => void
  setScope: (scope: 'ALL' | 'SHIFT') => void
  resetFilters: () => void
}

export const useOrderFilterStore = create<OrderFilterState>((set) => ({
  searchQuery: '',
  status: ['FULFILLED', 'COMPLETED'],
  dateFrom: null,
  dateTo: new Date(),
  scope: 'SHIFT',

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatus: (status) => set({ status }),
  setDateFrom: (dateFrom) => set({ dateFrom }),
  setDateTo: (dateTo) => set({ dateTo }),
  setScope: (scope) => set({ scope }),
  resetFilters: () =>
    set({
      searchQuery: '',
      status: ['FULFILLED', 'COMPLETED'],
      dateFrom: null,
      dateTo: new Date(),
      scope: 'SHIFT',
    }),
}))
