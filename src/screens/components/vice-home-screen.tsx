import { formatCurrency } from '@/shared/utils'
import React, { memo, useCallback } from 'react'
import { FlatList, Text, View } from 'react-native'
import { Item, useViceStore } from '../vice-store'

const CartItemComponent = memo(function CartItemComponent({ item }: { item: Item }) {
  return (
    <View className="flex-row items-center justify-between border-b border-surface-200 px-4 py-4">
      <View className="flex-1 pr-4">
        <Text className="text-xl font-bold text-surface-on" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="mt-1 text-lg font-medium text-primary">{formatCurrency(item.price)}</Text>
      </View>
      <View className="items-end">
        <Text className="text-lg font-semibold text-surface-on-variant">x{item.quantity}</Text>
        <Text className="mt-1 text-2xl font-black text-surface-on">
          {formatCurrency(item.price * item.quantity)}
        </Text>
      </View>
    </View>
  )
})

function ViceHomeScreen() {
  const items = useViceStore((state) => state.items)
  const subtotal = useViceStore((state) => state.subtotal)
  const discount = useViceStore((state) => state.discount)
  const tax = useViceStore((state) => state.tax)
  const total = useViceStore((state) => state.total)

  const renderItem = useCallback(
    ({ item }: { item: Item }) => <CartItemComponent item={item} />,
    [],
  )

  // 1. Màn hình chờ (Khi không có giỏ hàng)
  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-primary p-12">
        <Text className="text-center font-sans text-6xl font-bold tracking-[0.2em] text-white">
          SOUVENIR BITEXCO
        </Text>
        <Text className="mt-4 text-center font-sans text-2xl font-medium uppercase tracking-widest text-white/80">
          Chào mừng quý khách
        </Text>

        <View className="absolute bottom-12">
          <Text className="font-sans text-lg tracking-widest text-white/40">
            PHẦN MỀM QUẢN LÝ BÁN HÀNG BITEXCO
          </Text>
        </View>
      </View>
    )
  }

  // 2. Màn hình giỏ hàng (Khi đang quét món)
  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 justify-between p-8">
        <View className="flex-1 rounded-[32px] border border-surface-200 bg-surface-50 p-6 shadow-sm">
          <View className="mb-6 flex-row items-center justify-between border-b border-surface-300 pb-4">
            <Text className="font-sans text-3xl font-black uppercase tracking-tight text-surface-on">
              Chi tiết đơn hàng
            </Text>
            <View className="rounded-full bg-primary/10 px-4 py-2">
              <Text className="text-xl font-bold text-primary">{items.length} món</Text>
            </View>
          </View>

          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
          />
        </View>

        {/* Footer Tổng tiền */}
        <View className="mt-6 rounded-[32px] border border-surface-300 bg-surface-100 p-8 shadow-xl">
          {/* Detailed Summary */}
          <View className="mb-6 gap-2 border-b border-surface-300 pb-6">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans text-xl font-bold text-surface-on-variant">Tạm tính</Text>
              <Text className="font-sans text-2xl font-bold text-surface-on">
                {formatCurrency(subtotal)}
              </Text>
            </View>
            {discount > 0 && (
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-xl font-bold text-primary">Giảm giá</Text>
                <Text className="font-sans text-2xl font-bold text-primary">
                  -{formatCurrency(discount)}
                </Text>
              </View>
            )}
            <View className="flex-row items-center justify-between">
              <Text className="font-sans text-xl font-bold text-surface-on-variant">Thuế</Text>
              <Text className="font-sans text-2xl font-bold text-surface-on">
                {formatCurrency(tax)}
              </Text>
            </View>
          </View>

          {/* Grand Total */}
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="font-sans text-2xl font-bold uppercase tracking-widest text-surface-on-variant">
                Tổng thanh toán
              </Text>
              <Text className="mt-1 font-sans text-sm text-surface-on-variant">
                Vui lòng kiểm tra kỹ trước khi thanh toán
              </Text>
            </View>
            <Text className="font-sans text-7xl font-black text-primary">
              {formatCurrency(total)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const MemoizedViceHomeScreen = memo(ViceHomeScreen)
MemoizedViceHomeScreen.displayName = 'ViceHomeScreen'
export default MemoizedViceHomeScreen
