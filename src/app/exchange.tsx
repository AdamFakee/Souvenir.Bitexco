import { ExchangeScreen } from '@/shared/features/order/components/exchange-screen'
import { IOrder } from '@/shared/features/order/types'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useMemo } from 'react'
import { Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * Full-screen đổi hàng.
 * Params: orderId — order payload cached under ['exchange-order', orderId] từ Orders tab.
 */
export default function ExchangeRoute() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const order = useMemo(() => {
    if (!orderId) return null
    return queryClient.getQueryData<IOrder>(['exchange-order', orderId]) ?? null
  }, [orderId, queryClient])

  if (!orderId || !order) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-lg font-bold text-error">
          Không tìm thấy đơn hàng để đổi.
        </Text>
        <Text
          className="mt-4 text-base font-bold text-primary"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tab)/orders'))}
        >
          Quay lại
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <ExchangeScreen
      order={order}
      onDone={() => {
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.removeQueries({ queryKey: ['exchange-order', orderId] })
        if (router.canGoBack()) router.back()
        else router.replace('/(tab)/orders')
      }}
    />
  )
}
