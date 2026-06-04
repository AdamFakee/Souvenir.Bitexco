import { LogoSkydeck } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { BG_MAIN } from '@/shared/features/auth'
import { formatCurrency } from '@/shared/utils'
import { ShoppingBasket } from 'lucide-react-native'
import React, { memo, useCallback } from 'react'
import { FlatList, ImageBackground, StyleSheet, Text, View } from 'react-native'
import { Item, useViceStore } from '../vice-store'

const CartItemComponent = memo(function CartItemComponent({
  item,
  index,
}: {
  item: Item
  index: number
}) {
  return (
    <View className="min-h-[52px] flex-row items-center border-b border-outline-variant px-4 py-2.5">
      {/* STT */}
      <Text className="w-16 text-center text-4xl font-black text-surface-on">{index + 1}</Text>

      {/* Product Name */}
      <View className="ml-3 flex-1 pr-2">
        <Text className="text-4xl font-black text-surface-on" numberOfLines={2}>
          {item.name}
        </Text>
      </View>

      {/* Unit Price */}
      <Text
        className="w-40 text-right text-4xl font-bold text-surface-on-variant"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {formatCurrency(item.price)}
      </Text>

      {/* Quantity */}
      <Text className="w-20 text-center text-4xl font-black text-primary">x{item.quantity}</Text>
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
      <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
        {/* Teal gradient overlay matching Figma */}
        <View style={styles.overlay} />
        <View className="h-full w-full items-center justify-center">
          <LogoSkydeck width={250} height={250} />
        </View>
      </ImageBackground>
    )
  }

  // 2. Màn hình giỏ hàng (Khi đang quét món)
  return (
    <ImageBackground source={BG_MAIN} style={styles.bg} resizeMode="cover">
      {/* Teal gradient overlay matching Figma */}
      <View style={styles.overlay} />

      <View className="m-4 flex-1 overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-sm">
        <View className="flex-row items-center justify-between border-b border-outline-variant bg-white px-6 py-4">
          <View className="flex-1 pr-4">
            <Text className="text-4xl font-black tracking-tight text-surface-on">
              Chi tiết đơn hàng
            </Text>
          </View>

          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <ShoppingBasket size={26} color={COLORS.primary.default} />
          </View>
        </View>

        <View className="flex-1 flex-row">
          {/* Cột Trái: Chi tiết đơn hàng */}
          <View className="flex-[1.65] bg-white">
            {/* Tiêu đề bảng */}
            <View className="flex-row items-center border-b border-outline-variant bg-[#f8fafc] px-4 py-3">
              <Text className="w-16 text-center text-3xl font-black uppercase tracking-wider text-muted">
                STT
              </Text>
              <Text className="ml-3 flex-1 text-3xl font-black uppercase tracking-wider text-muted">
                Sản phẩm
              </Text>
              <Text className="w-40 text-right text-3xl font-black uppercase tracking-wider text-muted">
                Đơn giá
              </Text>
              <Text className="w-20 text-center text-3xl font-black uppercase tracking-wider text-muted">
                SL
              </Text>
            </View>

            {/* Danh sách giỏ hàng */}
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
            />
          </View>

          {/* Cột Phải: Tóm tắt thanh toán & Tổng tiền */}
          <View className="flex-1 justify-between border-l border-outline-variant bg-surface-50 p-5">
            <View>
              <View className="mb-5 flex-row items-center justify-between">
                <Text className="text-4xl font-black uppercase tracking-widest text-surface-on">
                  Tóm tắt đơn hàng
                </Text>
              </View>

              <View className="gap-4">
                <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                  <Text className="text-4xl font-bold text-muted">Tạm tính</Text>
                  <Text
                    className="ml-4 flex-1 text-right text-4xl font-black text-surface-on"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {formatCurrency(subtotal)}
                  </Text>
                </View>

                {discount > 0 && (
                  <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                    <Text className="text-4xl font-bold text-muted">Giảm giá</Text>
                    <Text
                      className="ml-4 flex-1 text-right text-4xl font-black text-success"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      -{formatCurrency(discount)}
                    </Text>
                  </View>
                )}

                <View className="flex-row items-center justify-between border-b border-dashed border-outline-variant pb-4">
                  <Text className="text-4xl font-bold text-muted">Thuế</Text>
                  <Text
                    className="ml-4 flex-1 text-right text-4xl font-black text-surface-on"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {formatCurrency(tax)}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-center justify-between border-t-2 border-outline-variant pt-5">
              <Text
                className="text-4xl font-black uppercase text-surface-on"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={styles.totalLabel}
              >
                Tổng thanh toán
              </Text>
              <Text
                className="ml-4 text-right text-4xl font-black text-primary"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={styles.totalValue}
              >
                {formatCurrency(total)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(83, 123, 144, 0.75)',
  },
  totalLabel: {
    flexShrink: 1,
  },
  totalValue: {
    minWidth: 180,
  },
})

const MemoizedViceHomeScreen = memo(ViceHomeScreen)
MemoizedViceHomeScreen.displayName = 'ViceHomeScreen'
export default MemoizedViceHomeScreen
