import { storage } from '@/shared/lib/storage'
import { ActorRefFrom, createActor } from 'xstate'
import { create } from 'zustand'
import { appMachine } from '../machines/app.machine'
import type { AppContext } from '../types/app.types'

// ---------------------------------------------------------------------------
// MMKV persistence — chỉ persist những field cần tồn tại sau khi app bị kill
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'app-machine-persist'

interface PersistedAppState {
  device: AppContext['device']
  paymentMethods: AppContext['paymentMethods']
  tenantConfig: AppContext['tenantConfig']
  accessToken: AppContext['accessToken']
  employee: AppContext['employee']
  cashSessionId: AppContext['cashSessionId']
}

function loadFromStorage(): PersistedAppState {
  try {
    const raw = storage.getString(STORAGE_KEY)
    if (!raw)
      return {
        device: null,
        paymentMethods: null,
        tenantConfig: null,
        accessToken: null,
        employee: null,
        cashSessionId: null,
      }
    return JSON.parse(raw) as PersistedAppState
  } catch {
    return {
      device: null,
      paymentMethods: null,
      tenantConfig: null,
      accessToken: null,
      employee: null,
      cashSessionId: null,
    }
  }
}

function saveToStorage(ctx: AppContext) {
  try {
    const toSave: PersistedAppState = {
      device: ctx.device,
      paymentMethods: ctx.paymentMethods,
      tenantConfig: ctx.tenantConfig,
      accessToken: ctx.accessToken,
      employee: ctx.employee,
      cashSessionId: ctx.cashSessionId,
    }
    storage.set(STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    console.error('[AppStore] saveToStorage failed:', e)
  }
}

// ---------------------------------------------------------------------------
// Zustand store — giống pattern usePosStore
// ---------------------------------------------------------------------------
interface AppStoreState {
  appService: ActorRefFrom<typeof appMachine> | null
  initApp: () => void
  destroyApp: () => void
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  appService: null,

  /**
   * Khởi tạo appMachine actor (Singleton).
   * - Đọc dữ liệu persist từ MMKV làm input.
   * - Subscribe để tự động persist khi context thay đổi.
   * Gọi 1 lần trong useAppInit.
   */
  initApp: () => {
    if (get().appService) return // Singleton — không chạy lại

    // 1. Đọc dữ liệu persist từ MMKV
    const persisted = loadFromStorage()

    // 2. Khởi tạo và start machine với dữ liệu đã persist
    const service = createActor(appMachine, {
      input: {
        device: persisted.device,
        paymentMethods: persisted.paymentMethods,
        tenantConfig: persisted.tenantConfig,
        accessToken: persisted.accessToken,
        employee: persisted.employee,
        cashSessionId: persisted.cashSessionId,
      },
    }).start()

    // 3. Subscribe để tự động ghi MMKV mỗi khi context thay đổi
    service.subscribe((state) => {
      saveToStorage(state.context)
    })

    set({ appService: service })
  },

  destroyApp: () => {
    const service = get().appService
    if (service) {
      service.stop()
      set({ appService: null })
    }
  },
}))
