import { zustandStorage } from '@/shared/lib'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { AuthSession, Staff } from '../types'

interface AuthState {
  currentStaff: Staff | null
  isOfflineMode: boolean
  isShiftOpen: boolean
  session: AuthSession | null
  setStaff: (staff: Staff | null) => void
  setShiftOpen: (isOpen: boolean) => void
  authenticate: (session: AuthSession) => void
  logout: () => void
  setOfflineMode: (isOffline: boolean) => void
}

const DEFAULT_AUTH_STATE = {
  currentStaff: null,
  isAuthenticated: false,
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
      authenticate: (session) => set({ session: session }),
      logout: () => set(DEFAULT_AUTH_STATE),
      setOfflineMode: (isOffline) => set({ isOfflineMode: isOffline }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => {
        if (state.isShiftOpen) {
          return {
            currentStaff: state.currentStaff,
            isShiftOpen: state.isShiftOpen,
            session: state.session,
            isOfflineMode: state.isOfflineMode,
          }
        }
        // When shift is not open, explicitly persist default values + global flags to clear context on restart
        return {
          ...DEFAULT_AUTH_STATE,
          isOfflineMode: state.isOfflineMode,
        }
      },
    },
  ),
)
