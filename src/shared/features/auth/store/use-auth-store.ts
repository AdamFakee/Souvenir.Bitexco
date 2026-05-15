import { zustandStorage } from '@/shared/lib'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { AuthSession, AuthTokens, Staff } from '../types'

interface AuthState {
  currentStaff: Staff | null
  tokens: AuthTokens | null
  isOfflineMode: boolean
  isShiftOpen: boolean
  session: AuthSession | null
  setStaff: (staff: Staff | null) => void
  setShiftOpen: (isOpen: boolean) => void
  setTokens: (tokens: AuthTokens | null) => void
  authenticate: (session: AuthSession, staff?: Staff, tokens?: AuthTokens) => void
  logout: () => void
  setOfflineMode: (isOffline: boolean) => void
}

const DEFAULT_AUTH_STATE = {
  currentStaff: null,
  tokens: null,
  isOfflineMode: false,
  isShiftOpen: false,
  session: null,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...DEFAULT_AUTH_STATE,
      setStaff: (staff) => set({ currentStaff: staff }),
      setShiftOpen: (isOpen) => set({ isShiftOpen: isOpen }),
      setTokens: (tokens) => set({ tokens }),
      authenticate: (session, staff, tokens) =>
        set((state) => ({
          session,
          currentStaff: staff ?? state.currentStaff,
          tokens: tokens ?? state.tokens,
        })),
      logout: () => set(DEFAULT_AUTH_STATE),
      setOfflineMode: (isOffline) => set({ isOfflineMode: isOffline }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => {
        if (state.isShiftOpen || state.tokens) {
          return {
            currentStaff: state.currentStaff,
            tokens: state.tokens,
            isShiftOpen: state.isShiftOpen,
            session: state.session,
            isOfflineMode: state.isOfflineMode,
          }
        }
        // When shift is not open and no tokens, explicitly persist default values + global flags
        return {
          ...DEFAULT_AUTH_STATE,
          isOfflineMode: state.isOfflineMode,
        }
      },
    },
  ),
)
