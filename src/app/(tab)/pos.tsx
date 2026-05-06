import { useRouter } from 'expo-router'
import { ArrowRight, Store } from 'lucide-react-native'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

import { HardwareBarcodeScanner } from '@/shared/components/common'
import { COLORS } from '@/shared/constants'
import { useAuthStore } from '@/shared/features/auth'
import { CheckoutPanel, OrderListSession, useCartStore } from '@/shared/features/pos'
import { ProductLocalAPI } from '@/shared/features/product'
import { toast } from '@/shared/store'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PosScreen() {
  const router = useRouter()
  const { isShiftOpen } = useAuthStore()
  const { addItem } = useCartStore()

  const handleScan = async (codes: string[]) => {
    for (const code of codes) {
      const product = await ProductLocalAPI.getProductByCode(code)
      if (product) {
        addItem(product)
      } else {
        toast.error(`Không tìm thấy sản phẩm cho mã: ${code}`, 'Thông báo')
      }
    }
  }

  if (!isShiftOpen) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-200 p-6">
        <Store size={80} color={COLORS.primary.default} />
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
    <SafeAreaView className="flex-1 flex-col bg-background">
      <HardwareBarcodeScanner onScan={handleScan} />
      <View className="flex-1" style={{ zIndex: 1 }}>
        <OrderListSession />
        <CheckoutPanel />
      </View>
    </SafeAreaView>
  )
}
