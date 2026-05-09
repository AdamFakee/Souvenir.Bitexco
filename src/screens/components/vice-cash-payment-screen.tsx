import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { Text, View } from 'react-native'
import { useViceStore } from '../vice-store'

function ViceCashPaymentScreen() {
  const subtotal = useViceStore((state) => state.subtotal)
  const discount = useViceStore((state) => state.discount)
  const tax = useViceStore((state) => state.tax)
  const total = useViceStore((state) => state.total)
  const customerPaid = useViceStore((state) => state.customerPaid)
  const change = useViceStore((state) => state.change)

  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <View className="w-full max-w-4xl">
        {/* Header */}
        <View className="mb-10 items-center">
          <Text className="text-center font-sans text-2xl font-bold uppercase tracking-[0.4em] text-surface-on-variant">
            Thanh toán bằng tiền mặt
          </Text>
        </View>

        {/* Bảng thông tin */}
        <View className="w-full">
          {/* Breakdown */}
          <View className="mb-4 gap-2 rounded-2xl bg-surface-50 p-6">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans text-xl font-medium text-surface-on-variant">
                Tạm tính
              </Text>
              <Text className="font-sans text-2xl font-bold text-surface-on">
                {formatCurrency(subtotal)}
              </Text>
            </View>
            {discount > 0 && (
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-xl font-medium text-primary">Giảm giá</Text>
                <Text className="font-sans text-2xl font-bold text-primary">
                  -{formatCurrency(discount)}
                </Text>
              </View>
            )}
            <View className="flex-row items-center justify-between">
              <Text className="font-sans text-xl font-medium text-surface-on-variant">Thuế</Text>
              <Text className="font-sans text-2xl font-bold text-surface-on">
                {formatCurrency(tax)}
              </Text>
            </View>
          </View>

          {/* Tổng tiền */}
          <View className="flex-row items-center border-b border-surface-100 px-8 py-6">
            <View className="flex-1">
              <Text className="font-sans text-3xl font-medium text-surface-on-variant">
                Tổng hóa đơn
              </Text>
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-center font-sans text-5xl font-black text-primary">
                {formatCurrency(total)}
              </Text>
            </View>
          </View>

          {/* Khách đưa */}
          <View className="flex-row items-center px-8 py-6">
            <View className="flex-1">
              <Text className="font-sans text-3xl font-medium text-surface-on-variant">
                Khách hàng đưa
              </Text>
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-center font-sans text-7xl font-black text-surface-on">
                {formatCurrency(customerPaid)}
              </Text>
            </View>
          </View>

          {/* Tiền thối */}
          <View className="flex-row items-center border-t border-primary px-8 py-6">
            <View className="flex-1 justify-center">
              <Text className="font-sans text-3xl font-medium text-surface-on-variant">
                Tiền thối lại
              </Text>
            </View>
            <View className="flex-1 justify-center">
              <Text className="justify-cente text-center font-sans text-7xl font-black text-primary">
                {formatCurrency(change)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export default memo(ViceCashPaymentScreen)
