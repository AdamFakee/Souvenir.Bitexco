import { ErrorFallback } from '@/shared/components/common'
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
            <StatusBar style="dark" />

            <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => {}}>
              <Stack
                screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'white' } }}
              >
                <Stack.Screen name="index" />
              </Stack>
            </ErrorBoundary>
          </QueryClientProvider>
        </AppDatabaseProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  )
}
