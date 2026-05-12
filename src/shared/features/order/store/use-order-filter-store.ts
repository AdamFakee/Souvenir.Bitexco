import { OrderStatus } from '@/shared/lib/database/models/order'
import { create } from 'zustand'

interface OrderFilterState {
  searchQuery: string
  status: OrderStatus | null
  dateFrom: Date | null
  dateTo: Date | null

  setSearchQuery: (query: string) => void
  setStatus: (status: OrderStatus | null) => void
  setDateFrom: (date: Date | null) => void
  setDateTo: (date: Date | null) => void
  resetFilters: () => void
}

export const useOrderFilterStore = create<OrderFilterState>((set) => ({
  searchQuery: '',
  status: null,
  dateFrom: null,
  dateTo: new Date(),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatus: (status) => set({ status }),
  setDateFrom: (dateFrom) => set({ dateFrom }),
  setDateTo: (dateTo) => set({ dateTo }),
  resetFilters: () =>
    set({
      searchQuery: '',
      status: null,
      dateFrom: null,
      dateTo: new Date(),
    }),
}))
