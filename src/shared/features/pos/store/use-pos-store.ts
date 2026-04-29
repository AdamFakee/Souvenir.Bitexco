import { create } from 'zustand'

interface PosState {
  searchQuery: string
  selectedCategoryId: string | null
  setSearchQuery: (query: string) => void
  setSelectedCategoryId: (id: string | null) => void
  clearFilters: () => void
}

export const usePosStore = create<PosState>((set) => ({
  searchQuery: '',
  selectedCategoryId: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
  clearFilters: () => set({ searchQuery: '', selectedCategoryId: null }),
}))
