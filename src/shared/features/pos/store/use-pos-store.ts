import { ActorRefFrom, createActor } from 'xstate'
import { create } from 'zustand'
import { storage } from '@/shared/lib/storage'
import { posStorage } from '../lib/pos-storage'
import { posMachine } from '../machines/pos.machine'

interface PosState {
  // Service Actor
  posService: ActorRefFrom<typeof posMachine> | null

  // UI Filters
  searchQuery: string
  selectedCategoryId: string | null
  // init pos service

  // Actions
  initPos: () => void
  destroyPos: () => void
  setSearchQuery: (query: string) => void
  setSelectedCategoryId: (id: string | null) => void
  clearFilters: () => void
  resetPos: () => void
}

export const usePosStore = create<PosState>((set, get) => ({
  posService: null,
  searchQuery: '',
  selectedCategoryId: null,
  /**
   * Khởi tạo POS Service (XState Actor) và thiết lập cơ chế persistence.
   * - Kiểm tra nếu service đã chạy thì bỏ qua (Singleton pattern).
   * - Khôi phục danh sách giỏ hàng từ bộ nhớ local (MMKV).
   * - Đăng ký listener để tự động lưu state mỗi khi context thay đổi.
   */
  initPos: () => {
    const currentService = get().posService
    if (currentService) return // Đã khởi tạo, không chạy lại

    // 1. Khôi phục dữ liệu các giỏ hàng từ bộ nhớ MMKV
    const initialCarts: any[] = posStorage.load()

    // 2. Khởi tạo và kích hoạt Actor (Machine Service)
    const service = createActor(posMachine, {
      input: { initialCarts },
    }).start()

    // 3. Đăng ký theo dõi thay đổi để tự động lưu dữ liệu (Persistence)
    // ponytail: defer getSnapshot() + mapping to debounced save fn to avoid
    // blocking JS thread on every cart update
    service.subscribe((state) => {
      try {
        const cartsRef = state.context.carts
        posStorage.save(() => {
          return Object.entries(cartsRef).map(([id, actor]) => {
            const snapshot = actor.getSnapshot()
            const { appliedVoucher, ...restContext } = snapshot.context
            return {
              id,
              label: snapshot.context.label,
              context: restContext,
            }
          })
        })
      } catch {}
    })

    set({ posService: service })
  },

  destroyPos: () => {
    const service = get().posService
    if (service) {
      service.stop()
      set({ posService: null })
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
  clearFilters: () => set({ searchQuery: '', selectedCategoryId: null }),
  resetPos: () => {
    const service = get().posService
    if (service) {
      service.send({ type: 'RESET_POS' })
      posStorage.save.flush()
    } else {
      try {
        posStorage.save.cancel()
        storage.remove('pos-machine-state')
      } catch {}
    }
    set({ searchQuery: '', selectedCategoryId: null })
  },
}))
