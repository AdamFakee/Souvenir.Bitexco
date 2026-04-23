import { type FallbackProps } from 'react-error-boundary'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ErrorFallbackProps extends FallbackProps {
  /** Optional error code to display. Defaults to '500_INTERNAL' */
  errorCode?: string
  /** Called when the user taps the X / close button */
  onClose?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A React-Native error fallback screen using NativeWind.
 *
 * Designed to be used as the `FallbackComponent` prop of
 * `react-error-boundary`'s <ErrorBoundary />.
 *
 * @example
 * <ErrorBoundary FallbackComponent={ErrorFallback}>
 *   <App />
 * </ErrorBoundary>
 */
export function ErrorFallback({
  error,
  resetErrorBoundary,
  errorCode = '500_INTERNAL',
  onClose,
}: ErrorFallbackProps) {
  const insets = useSafeAreaInsets()
  const err = error instanceof Error ? error : new Error(String(error))

  return null
}
