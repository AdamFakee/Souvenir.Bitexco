import { useReactQueryDevTools } from '@dev-plugins/react-query'
import { QueryClient } from '@tanstack/react-query'

/**
 * Custom hook to initialize React Query DevTools in development mode.
 *
 * @param queryClient The TanStack Query Client instance.
 * @example
 * // In your root _layout.tsx:
 * useDevTools(queryClient);
 */
export const useDevTools = (queryClient: QueryClient) => {
  if (__DEV__) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReactQueryDevTools(queryClient)
  }
}
