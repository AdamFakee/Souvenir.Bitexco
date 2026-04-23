import { QUERY_PRESETS } from '@/shared/configs'
import NetInfo from '@react-native-community/netinfo'
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query'
import { AppStateStatus, Platform } from 'react-native'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: QUERY_PRESETS.DEFAULT,
    mutations: {
      retry: false,
    },
  },
})

export function setupReactQueryMobile() {
  // Auto refetch on network reconnect
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected)
    })
  })
}

export function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active')
  }
}
