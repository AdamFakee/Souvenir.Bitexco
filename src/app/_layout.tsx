import { ErrorFallback } from '@/shared/components/common'
import { GlobalPopup, GlobalToast } from '@/shared/components/ui'
import { useAppInit, useAuthGuard } from '@/shared/hooks'
import { useViceScreen } from '@/screens/use-vice-screen'
import {
  AppDatabaseProvider,
  onAppStateChange,
  queryClient,
  setupReactQueryMobile,
  useDevTools,
} from '@/shared/lib'
import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { AppState } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { configureReanimatedLogger } from 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import './global.css'

setupReactQueryMobile()

// Disable Reanimated strict mode warnings (reading/writing value during render)
configureReanimatedLogger({
  strict: false,
})

/**
 * Component trung gian để đảm bảo useAppInit được gọi
 * bên trong các Provider (Database, QueryClient...)
 */
function AppBootstrapper() {
  useAppInit()
  useAuthGuard()
  useViceScreen()
  return null
}

export default function RootLayout() {
  useDevTools(queryClient)

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange)
    return () => subscription.remove()
  }, [])

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <AppDatabaseProvider>
          <QueryClientProvider client={queryClient}>
            <AppBootstrapper />
            <StatusBar style="dark" />

            <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => {}}>
              <Stack
                screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'white' } }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tab)" />
              </Stack>
            </ErrorBoundary>
            <GlobalPopup />
            <GlobalToast />
          </QueryClientProvider>
        </AppDatabaseProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  )
}
