import { zustandStorage } from '@/shared/lib'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface DeviceState {
  lastStaffSyncAt: number | null
  setLastStaffSyncAt: (timestamp: number) => void
}

const DEFAULT_DEVICE_STATE = {
  deviceId: null,
  deviceToken: null,
  refreshToken: null,
  outletId: null,
  isDevicePaired: false,
  lastStaffSyncAt: null,
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set) => ({
      ...DEFAULT_DEVICE_STATE,
      setLastStaffSyncAt: (timestamp) => set({ lastStaffSyncAt: timestamp }),
    }),
    {
      name: 'device-storage',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
)
