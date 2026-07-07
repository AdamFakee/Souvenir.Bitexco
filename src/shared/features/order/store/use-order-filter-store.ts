import { PaymentMethodCode } from '@/shared/features/payment'
import { create } from 'zustand'
import { OrderStatusType } from '../types'

interface OrderFilterState {
  searchQuery: string
  status: OrderStatusType | string | null
  dateFrom: Date | null
  dateTo: Date | null
  /** Mã nhân viên được chọn để lọc. null = tất cả nhân viên */
  staffId: string | null
  paymentMethod: PaymentMethodCode | null

  setSearchQuery: (query: string) => void
  setStatus: (status: OrderStatusType | string | null) => void
  setDateFrom: (date: Date | null) => void
  setDateTo: (date: Date | null) => void
  setStaffId: (staffId: string | null) => void
  setPaymentMethod: (paymentMethod: PaymentMethodCode | null) => void
  resetFilters: () => void
}

const getInitialFilters = () => ({
  searchQuery: '',
  status: null,
  dateFrom: new Date(),
  dateTo: new Date(),
  staffId: null,
  paymentMethod: null,
})

export const useOrderFilterStore = create<OrderFilterState>((set) => ({
  ...getInitialFilters(),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatus: (status) => set({ status }),
  setDateFrom: (dateFrom) => set({ dateFrom }),
  setDateTo: (dateTo) => set({ dateTo }),
  setStaffId: (staffId) => set({ staffId }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  resetFilters: () => set(getInitialFilters()),
}))
