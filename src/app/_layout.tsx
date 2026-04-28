import { ErrorFallback } from '@/shared/components/common'
import { GlobalPopup } from '@/shared/components/ui'
import { useAuthGuard } from '@/shared/hooks'
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
import { SafeAreaProvider } from 'react-native-safe-area-context'
import './global.css'

setupReactQueryMobile()

/**
 * Component trung gian để đảm bảo useAppInit được gọi
 * bên trong các Provider (Database, QueryClient...)
 */
function AppBootstrapper() {
  useAuthGuard()
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
              </Stack>
            </ErrorBoundary>
            <GlobalPopup />
          </QueryClientProvider>
        </AppDatabaseProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  )
}
