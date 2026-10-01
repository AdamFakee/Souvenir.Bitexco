import { storage } from '@/shared/lib/storage'
import debounce from 'lodash.debounce'

const POS_STORAGE_KEY = 'pos-machine-state'

/**
 * Helper for POS state persistence with Debounce and Try-catch.
 * This prevents disk write storms and ensures reliability.
 */
export const posStorage = {
  save: debounce((dataOrFn: any) => {
    try {
      const data = typeof dataOrFn === 'function' ? dataOrFn() : dataOrFn
      storage.set(POS_STORAGE_KEY, JSON.stringify(data))
    } catch {}
  }, 500),

  load: (): any[] => {
    try {
      const saved = storage.getString(POS_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  },
}
