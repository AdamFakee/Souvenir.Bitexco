import { useLocalSearchParams } from 'expo-router'
import { RouteParamsMap } from '../constants/routes.const'

/**
 * Custom hook to get type-safe route parameters based on RouteParamsMap.
 * @param _route Key from RouteParamsMap to enforce typing (optional usage for documentation)
 */
export function useAppParams<K extends keyof RouteParamsMap>(_route?: K) {
  return useLocalSearchParams<RouteParamsMap[K]>()
}
