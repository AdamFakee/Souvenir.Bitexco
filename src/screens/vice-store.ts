import { create } from 'zustand'

export interface Item {
  id: string
  name: string
  price: number
  quantity: number
}

interface ViceState {
  items: Item[]
  total: number
  customerName: string
  orderId: string
  qrCodeUrl: string
  promoImageUrl: string
  currentScreen: 'Home' | 'Payment' | 'Promotion'

  // Actions
  updateCart: (items: Item[], total: number) => void
  setCustomerName: (name: string) => void
  setOrderId: (orderId: string) => void
  showPayment: (qrCodeUrl: string) => void
  showPromo: (imageUrl: string) => void
  setCurrentScreen: (screen: 'Home' | 'Payment' | 'Promotion') => void
}

export const useViceStore = create<ViceState>((set) => ({
  items: [],
  total: 0,
  customerName: '',
  orderId: '',
  qrCodeUrl: '',
  promoImageUrl: '',
  currentScreen: 'Home',

  updateCart: (items, total) =>
    set({
      items,
      total,
      currentScreen: 'Home',
      qrCodeUrl: '',
      promoImageUrl: '',
    }),
  setCustomerName: (customerName) => set({ customerName, currentScreen: 'Home' }),
  setOrderId: (orderId) => set({ orderId, currentScreen: 'Home' }),
  showPayment: (qrCodeUrl) => set({ qrCodeUrl, currentScreen: 'Payment' }),
  showPromo: (promoImageUrl) => set({ promoImageUrl, currentScreen: 'Promotion', items: [] }),
  setCurrentScreen: (currentScreen) => set({ currentScreen }),
}))
