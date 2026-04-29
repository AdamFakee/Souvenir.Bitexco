import { useRouter } from 'expo-router'
import { ArrowRight, Store } from 'lucide-react-native'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

import { useAuthStore } from '@/shared/features/auth'
import { CartSession, ContentSession, HeaderSession } from '@/shared/features/pos'

export default function PosScreen() {
  const router = useRouter()
  const { isShiftOpen } = useAuthStore()

  if (!isShiftOpen) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-200 p-6">
        <Store size={80} color="#4f46e5" />
        <Text className="mt-4 text-headline-md font-bold text-surface-on">Chưa mở ca làm việc</Text>
        <Text className="mb-8 mt-2 max-w-md text-center text-body-base text-surface-on-variant">
          Bạn cần mở ca làm việc và kiểm đếm tiền mặt đầu ca trước khi thực hiện bán hàng.
        </Text>
        <TouchableOpacity
          className="flex-row items-center rounded-xl bg-primary px-8 py-4 shadow-md"
          onPress={() => router.push('/(tab)/shift')}
        >
          <Text className="mr-2 text-body-base font-bold text-primary-on">Đi tới Mở ca</Text>
          <ArrowRight size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View className="flex-1 flex-col bg-background">
      <HeaderSession />

      <View className="flex-1 flex-row">
        <ContentSession />

        <CartSession />
      </View>
    </View>
  )
}
