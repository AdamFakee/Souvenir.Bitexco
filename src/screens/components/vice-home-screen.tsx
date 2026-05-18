import { COLORS } from '@/shared/constants'
import { formatCurrency } from '@/shared/utils'
import { ShoppingBasket, Store } from 'lucide-react-native'
import React, { memo, useCallback } from 'react'
import { FlatList, Text, View } from 'react-native'
import { Item, useViceStore } from '../vice-store'

const CartItemComponent = memo(function CartItemComponent({
  item,
  index,
}: {
  item: Item
  index: number
}) {
  return (
    <View className="flex-row items-center border-b border-surface-100 py-4 active:bg-surface-50">
      {/* STT */}
      <Text className="w-12 text-center text-base font-bold text-surface-on-variant">
        {index + 1}
      </Text>

      {/* Product Name */}
      <View className="flex-1 pr-4">
        <Text className="text-lg font-bold text-surface-on" numberOfLines={2}>
          {item.name}
        </Text>
      </View>

      {/* Unit Price */}
      <Text className="w-32 text-center text-base font-semibold text-surface-on-variant">
        {formatCurrency(item.price)}
      </Text>

      {/* Quantity */}
      <Text className="w-24 text-center text-base font-bold text-surface-on">x{item.quantity}</Text>

      {/* Subtotal */}
      <Text className="w-32 text-right text-lg font-black text-surface-on">
        {formatCurrency(item.price * item.quantity)}
      </Text>
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
    ({ item, index }: { item: Item; index: number }) => (
      <CartItemComponent item={item} index={index} />
    ),
    [],
  )

  // 1. Màn hình chờ (Khi không có giỏ hàng)
  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-12">
        <Store size={100} color={COLORS.primary.default} strokeWidth={1.5} />
        <Text className="mt-6 text-center font-sans text-5xl font-black uppercase tracking-[0.2em] text-surface-on">
          SOUVENIR BITEXCO
        </Text>
        <Text className="mt-3 text-center font-sans text-xl font-medium uppercase tracking-widest text-surface-on-variant">
          Chào mừng quý khách
        </Text>
      </View>
    )
  }

  // 2. Màn hình giỏ hàng (Khi đang quét món)
  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 flex-row gap-6 p-6">
        {/* Cột Trái: Chi tiết đơn hàng (65%) */}
        <View
          style={{ flex: 6.5 }}
          className="justify-between overflow-hidden rounded-[24px] border border-surface-200 bg-white p-6 shadow-sm"
        >
          {/* Header giỏ hàng */}
          <View className="mb-6 flex-row items-center gap-3 border-b border-surface-200 pb-4">
            <ShoppingBasket size={24} color={COLORS.primary.default} />
            <Text className="font-sans text-xl font-black uppercase tracking-wider text-surface-on">
              Chi tiết đơn hàng
            </Text>
          </View>

          {/* Tiêu đề Bảng tinh gọn */}
          <View className="mb-2 flex-row items-center border-b border-surface-200 px-1 pb-3">
            <Text className="w-12 text-center text-xs font-black uppercase text-muted">STT</Text>
            <Text className="flex-1 text-xs font-black uppercase text-muted">Sản phẩm</Text>
            <Text className="w-32 text-center text-xs font-black uppercase text-muted">
              Đơn giá
            </Text>
            <Text className="w-24 text-center text-xs font-black uppercase text-muted">SL</Text>
            <Text className="w-32 text-right text-xs font-black uppercase text-muted">
              Thành tiền
            </Text>
          </View>

          {/* Danh sách giỏ hàng */}
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
          />
        </View>

        {/* Cột Phải: Tóm tắt thanh toán & Tổng tiền (35%) */}
        <View
          style={{ flex: 3.5 }}
          className="justify-between rounded-[24px] border border-surface-200 bg-white p-6 shadow-sm"
        >
          {/* Tóm tắt thanh toán chi tiết */}
          <View className="gap-4">
            <Text className="border-b border-surface-200 pb-3 font-sans text-xs font-bold uppercase tracking-widest text-muted">
              TÓM TẮT ĐƠN HÀNG
            </Text>

            <View className="flex-row items-center justify-between">
              <Text className="font-sans text-base font-medium text-surface-on-variant">
                Tạm tính
              </Text>
              <Text className="font-sans text-lg font-bold text-surface-on">
                {formatCurrency(subtotal)}
              </Text>
            </View>

            {discount > 0 && (
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-base font-bold text-success">Giảm giá</Text>
                <Text className="font-sans text-lg font-bold text-success">
                  -{formatCurrency(discount)}
                </Text>
              </View>
            )}

            <View className="flex-row items-center justify-between">
              <Text className="font-sans text-base font-medium text-surface-on-variant">Thuế</Text>
              <Text className="font-sans text-lg font-bold text-surface-on">
                {formatCurrency(tax)}
              </Text>
            </View>
          </View>

          {/* Hộp tổng tiền nổi bật */}
          <View className="rounded-[20px] border border-outline-variant bg-surface-100 p-6 shadow-sm">
            <Text className="mb-2 font-sans text-xs font-black uppercase tracking-widest text-surface-on-variant">
              Tổng thanh toán
            </Text>
            <Text
              className="font-sans text-5xl font-black text-primary"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
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
