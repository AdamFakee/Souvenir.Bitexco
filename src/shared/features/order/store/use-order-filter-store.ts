import { create } from 'zustand'

interface OrderFilterState {
  searchQuery: string
  status: string[] | string | null
  dateFrom: Date | null
  dateTo: Date | null
  /** Mã nhân viên được chọn để lọc. null = tất cả nhân viên */
  staffId: string | null

  setSearchQuery: (query: string) => void
  setStatus: (status: string[] | string | null) => void
  setDateFrom: (date: Date | null) => void
  setDateTo: (date: Date | null) => void
  setStaffId: (staffId: string | null) => void
  resetFilters: () => void
}

export const useOrderFilterStore = create<OrderFilterState>((set) => ({
  searchQuery: '',
  status: ['FULFILLED', 'COMPLETED'],
  dateFrom: new Date(),
  dateTo: new Date(),
  staffId: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatus: (status) => set({ status }),
  setDateFrom: (dateFrom) => set({ dateFrom }),
  setDateTo: (dateTo) => set({ dateTo }),
  setStaffId: (staffId) => set({ staffId }),
  resetFilters: () =>
    set({
      searchQuery: '',
      status: ['FULFILLED', 'COMPLETED'],
      dateFrom: null,
      dateTo: new Date(),
      staffId: null,
    }),
}))
