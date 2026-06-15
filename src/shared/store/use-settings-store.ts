import { zustandStorage } from '@/shared/lib/storage'
import i18n from '@/shared/lib/i18n'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface AppSettings {
  language: 'vi' | 'en'
  refundRequireChecklist: boolean
  exchangeRequireChecklist: boolean
}

interface SettingsState {
  settings: AppSettings
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  resetSettings: () => void
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'vi',
  refundRequireChecklist: true,
  exchangeRequireChecklist: true,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      setSetting: (key, value) =>
        set((state) => {
          // Side-effect: change language on update
          if (key === 'language' && value !== state.settings.language) {
            i18n.changeLanguage(value as string)
          }

          return {
            settings: {
              ...state.settings,
              [key]: value,
            },
          }
        }),

      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS })
        i18n.changeLanguage(DEFAULT_SETTINGS.language)
      },
    }),
    {
      name: 'global-settings-storage',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
)

// Helper gọi trực tiếp ngoài React Components (giống pattern toast)
export const appSettings = {
  get: <K extends keyof AppSettings>(key: K): AppSettings[K] => {
    return useSettingsStore.getState().settings[key]
  },
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    useSettingsStore.getState().setSetting(key, value)
  },
}
