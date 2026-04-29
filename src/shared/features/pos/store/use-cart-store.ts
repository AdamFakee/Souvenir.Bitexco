import { ProductModel } from '@/shared/lib/database/models'
import { zustandStorage } from '@/shared/lib/storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type CartProduct = {
  id: string
  name: string
  price: number
  sku: string
  barcode?: string | null
  image?: string | null
}

export type CartItem = {
  id: string // product id
  product: CartProduct
  quantity: number
  price: number // price at the time of adding
}

type CartSessionData = {
  id: string
  name: string
  items: Record<string, CartItem>
  discount: number
  createdAt: number
}

interface CartState {
  sessions: Record<string, CartSessionData>
  activeSessionId: string | null
  isProcessing: boolean

  // Actions
  createNewSession: (name?: string) => string
  removeSession: (sessionId: string) => void
  setActiveSession: (sessionId: string) => void

  addItem: (product: ProductModel | CartProduct, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  setDiscount: (discount: number) => void
  clearCurrentCart: () => void
}

const generateSessionId = () =>
  `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      sessions: {},
      activeSessionId: null,
      isProcessing: false,

      createNewSession: (customName) => {
        const id = generateSessionId()
        const name = customName || `Đơn ${Object.keys(get().sessions).length + 1}`

        set((state) => ({
          sessions: {
            [id]: {
              id,
              name,
              items: {},
              discount: 0,
              createdAt: Date.now(),
            },
            ...state.sessions,
          },
          activeSessionId: id,
        }))

        return id
      },

      removeSession: (sessionId) => {
        set((state) => {
          const newSessions = { ...state.sessions }
          delete newSessions[sessionId]

          const remainingIds = Object.keys(newSessions)
          const newActiveId =
            state.activeSessionId === sessionId
              ? remainingIds.length > 0
                ? remainingIds[0]
                : null
              : state.activeSessionId

          return {
            sessions: newSessions,
            activeSessionId: newActiveId,
          }
        })
      },

      setActiveSession: (sessionId) => {
        set({ activeSessionId: sessionId })
      },

      addItem: (productInput, quantity = 1) => {
        // Extract plain data from WatermelonDB Model or plain object
        const product: CartProduct = {
          id: productInput.id,
          name: productInput.name,
          price: productInput.price,
          sku: productInput.sku || '',
          barcode: 'barcode' in productInput ? productInput.barcode : null,
          image: 'image' in productInput ? productInput.image : null,
        }

        set((currentState) => {
          let sessionId = currentState.activeSessionId
          let newSessions = { ...currentState.sessions }

          // If no active session, create one
          if (!sessionId || !newSessions[sessionId]) {
            sessionId = generateSessionId()
            newSessions[sessionId] = {
              id: sessionId,
              name: `Đơn ${Object.keys(newSessions).length + 1}`,
              items: {},
              discount: 0,
              createdAt: Date.now(),
            }
          }

          const currentSession = newSessions[sessionId]
          const existingItem = currentSession.items[product.id]

          const updatedItems = {
            ...currentSession.items,
            [product.id]: {
              id: product.id,
              product,
              price: product.price,
              quantity: existingItem ? existingItem.quantity + quantity : quantity,
            },
          }

          return {
            sessions: {
              ...newSessions,
              [sessionId]: {
                ...currentSession,
                items: updatedItems,
              },
            },
            activeSessionId: sessionId,
          }
        })
      },

      removeItem: (productId) => {
        set((state) => {
          const sessionId = state.activeSessionId
          if (!sessionId || !state.sessions[sessionId]) return state

          const currentSession = state.sessions[sessionId]
          const newItems = { ...currentSession.items }
          delete newItems[productId]

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...currentSession,
                items: newItems,
              },
            },
          }
        })
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }

        set((state) => {
          const sessionId = state.activeSessionId
          if (!sessionId || !state.sessions[sessionId]) return state

          const currentSession = state.sessions[sessionId]
          const item = currentSession.items[productId]
          if (!item) return state

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...currentSession,
                items: {
                  ...currentSession.items,
                  [productId]: {
                    ...item,
                    quantity,
                  },
                },
              },
            },
          }
        })
      },

      setDiscount: (discount) => {
        set((state) => {
          const sessionId = state.activeSessionId
          if (!sessionId || !state.sessions[sessionId]) return state

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...state.sessions[sessionId],
                discount,
              },
            },
          }
        })
      },

      clearCurrentCart: () => {
        set((state) => {
          const sessionId = state.activeSessionId
          if (!sessionId || !state.sessions[sessionId]) return state

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...state.sessions[sessionId],
                items: {},
                discount: 0,
              },
            },
          }
        })
      },
    }),
    {
      name: 'pos-cart-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
)
