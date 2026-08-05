import { useViceScreen } from '@/screens/use-vice-screen'
import { ErrorFallback } from '@/shared/components/common'
import { GlobalEasyLoading, GlobalPopup, GlobalToast } from '@/shared/components/ui'
import { HandoverReminderOverlay } from '@/shared/features/note'
import { useAppGate, useAppInit } from '@/shared/hooks'
import {
  AppDatabaseProvider,
  onAppStateChange,
  queryClient,
  setupReactQueryMobile,
  useDevTools,
} from '@/shared/lib'
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope'
import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { AppState } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { configureReanimatedLogger } from 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { enableScreens } from 'react-native-screens'
import './global.css'

SplashScreen.preventAutoHideAsync()

// Dùng native platform views thay vì React views — giảm memory, tăng tốc transition
enableScreens(true)
// Freeze inactive screens ở native level — tab ẩn dừng layout/draw hoàn toàn
// enableFreeze(true)

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
  useAppGate()
  useViceScreen()
  return null
}

export default function RootLayout() {
  useDevTools(queryClient)

  const [fontsLoaded] = useFonts({
    'Manrope-Regular': Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
    'Manrope-ExtraBold': Manrope_800ExtraBold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange)
    return () => subscription.remove()
  }, [])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
                  <Stack.Screen name="exchange" options={{ animation: 'slide_from_right' }} />
                </Stack>
              </ErrorBoundary>
              <GlobalPopup />
              <GlobalToast />
              <GlobalEasyLoading />
              <HandoverReminderOverlay />
            </QueryClientProvider>
          </AppDatabaseProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
