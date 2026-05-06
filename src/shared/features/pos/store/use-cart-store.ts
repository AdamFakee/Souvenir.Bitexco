import { ProductModel } from '@/shared/lib/database/models'
import { zustandStorage } from '@/shared/lib/storage'
import { toast } from '@/shared/store'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type CartProduct = {
  id: string
  nameEn: string
  nameVi: string
  price: number
  sku: string
  unit: string
  taxRate: number
  image?: string | null
  stock?: number | null
}

export type CartItem = {
  id: string // product id
  product: CartProduct
  quantity: number
  price: number // price at the time of adding
}

export type AppliedVoucher = {
  code: string
  percent: number
  maxDiscountAmount?: number
}

type CartSessionData = {
  id: string
  name: string
  items: Record<string, CartItem>
  discount: number
  appliedVoucher?: AppliedVoucher | null
  note: string
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
  applyVoucher: (voucher: AppliedVoucher) => void
  removeVoucher: () => void
  setNote: (note: string) => void
  removeCurrentCart: () => void
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
              appliedVoucher: null,
              note: '',
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
          nameEn: 'nameEn' in productInput ? productInput.nameEn : '',
          nameVi: 'nameVi' in productInput ? productInput.nameVi : '',
          price: productInput.price,
          sku: productInput.sku || '',
          unit: 'unit' in productInput ? productInput.unit : '',
          taxRate: 'taxRate' in productInput ? (productInput.taxRate as number) : 0,
          image: 'image' in productInput ? productInput.image : null,
          stock: 'stock' in productInput ? (productInput.stock as number) : null,
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
              appliedVoucher: null,
              note: '',
              createdAt: Date.now(),
            }
          }

          const currentSession = newSessions[sessionId]
          const existingItem = currentSession.items[product.id]
          const currentQty = existingItem ? existingItem.quantity : 0

          if (product.stock !== undefined && product.stock !== null) {
            if (product.stock <= 0) {
              toast.warning(`Sản phẩm [${product.nameEn}] đã hết hàng!`, 'Hết hàng')
              return currentState
            }
            if (currentQty + quantity > product.stock) {
              toast.warning(
                `Sản phẩm [${product.nameEn}] chỉ còn ${product.stock} sản phẩm trong kho!`,
                'Vượt quá số lượng tồn kho',
              )
              return currentState
            }
          }

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

          const stock = item.product.stock
          if (stock !== undefined && stock !== null) {
            if (quantity > stock) {
              toast.warning(
                `Không thể tăng số lượng. Sản phẩm [${item.product.nameEn}] chỉ còn ${stock} sản phẩm trong kho!`,
                'Vượt quá tồn kho',
              )
              return state
            }
          }

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

      applyVoucher: (voucher) => {
        set((state) => {
          const sessionId = state.activeSessionId
          if (!sessionId || !state.sessions[sessionId]) return state

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...state.sessions[sessionId],
                appliedVoucher: voucher,
              },
            },
          }
        })
      },

      removeVoucher: () => {
        set((state) => {
          const sessionId = state.activeSessionId
          if (!sessionId || !state.sessions[sessionId]) return state

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...state.sessions[sessionId],
                appliedVoucher: null,
              },
            },
          }
        })
      },

      setNote: (note) => {
        set((state) => {
          const sessionId = state.activeSessionId
          if (!sessionId || !state.sessions[sessionId]) return state

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...state.sessions[sessionId],
                note,
              },
            },
          }
        })
      },

      removeCurrentCart: () => {
        set((state) => {
          const { activeSessionId, sessions } = state
          const newSessions = { ...sessions }

          // Xóa session hiện tại nếu có
          if (activeSessionId && newSessions[activeSessionId]) {
            delete newSessions[activeSessionId]
          }

          // Lấy danh sách ID còn lại
          const remainingIds = Object.keys(newSessions)

          // Chọn session đầu tiên trong danh sách làm active, nếu không còn thì null
          const nextActiveId = remainingIds.length > 0 ? remainingIds[0] : null

          return {
            sessions: newSessions,
            activeSessionId: nextActiveId,
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
