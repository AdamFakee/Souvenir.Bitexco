import { Href } from 'expo-router'

export const ROUTES = {
  STAFF_LOGIN: { path: () => '/(auth)/staff-login' as Href, params: {} as never },
  OPEN_SHIFT: { path: () => '/(auth)/open-shift' as Href, params: {} as never },
  POS: { path: () => '/(tab)/pos' as Href, params: {} as never },
  ORDERS: { path: () => '/(tab)/orders' as Href, params: {} as never },
  SHIFT: { path: () => '/(tab)/shift' as Href, params: {} as never },
  DASHBOARD: { path: () => '/(tab)/dashboard' as Href, params: {} as never },
} as const

export type RouteName = keyof typeof ROUTES
export type RouteParamsMap = {
  [K in RouteName]: (typeof ROUTES)[K] extends { params: infer P } ? P : never
}

export type AppRoute = RouteName
