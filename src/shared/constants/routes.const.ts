import { Href } from 'expo-router'

export const ROUTES = {
  STAFF_LOGIN: { path: () => '/(auth)/staff-login' as Href, params: {} as never },
} as const

export type RouteName = keyof typeof ROUTES
export type RouteParamsMap = {
  [K in RouteName]: (typeof ROUTES)[K] extends { params: infer P } ? P : never
}

export type AppRoute = RouteName
