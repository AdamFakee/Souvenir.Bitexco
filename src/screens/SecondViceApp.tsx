import React, { useEffect } from 'react'
import { Text, View } from 'react-native'
import { useViceStore } from './vice-store'

export default function SecondViceApp() {
  const { customerName, updateCart, setCustomerName } = useViceStore()

  useEffect(() => {
    console.log('SecondViceApp mounted - Testing Store Isolation')
  }, [])

  return (
    <View className="flex-1 items-center justify-center bg-blue-600 p-10">
      <Text className="text-center font-bold text-4xl text-white">SECOND VICE SCREEN</Text>

      <View className="mt-8 w-full rounded-2xl border border-white/30 bg-white/20 p-6">
        <Text className="text-center font-bold text-xl text-white">Dữ liệu Store hiện tại:</Text>
        <Text className="text-yellow-300 mt-2 text-center text-2xl">
          Khách hàng: {customerName || 'Chưa có'}
        </Text>
      </View>

      <View className="mt-8 rounded-2xl bg-black/20 p-6">
        <Text className="text-center text-lg italic text-white">
          Màn hình này có bộ nhớ RAM riêng biệt. Nó chỉ cập nhật khi nhận được Event từ Native.
        </Text>
      </View>
    </View>
  )
}
