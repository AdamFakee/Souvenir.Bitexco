import { Container } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { ProductModel } from '@/shared/lib/database/models'
import { formatCurrency } from '@/shared/utils'
import withObservables from '@nozbe/with-observables'
import { ShoppingBasket } from 'lucide-react-native'
import React, { memo } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

interface ProductCardProps {
  item: ProductModel
  addToCart: (product: ProductModel) => void
}

function ProductCard({ item, addToCart }: ProductCardProps) {
  const isOutOfStock = (item.stock ?? 0) <= 0

  return (
    <Pressable
      className={`m-2 transition-all active:scale-[0.98] ${isOutOfStock ? 'opacity-75' : ''}`}
      onPress={() => addToCart(item)}
      disabled={isOutOfStock}
    >
      <Container className="overflow-hidden rounded-2xl border-outline-variant px-0 py-0" shadow>
        <View className="relative h-32 items-center justify-center overflow-hidden bg-surface-300">
          {item.image ? (
            <Image source={{ uri: item.image }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <ShoppingBasket size={36} color={COLORS.outline.default} />
          )}
          {isOutOfStock && (
            <View className="absolute inset-0 items-center justify-center bg-black/60">
              <View className="rounded-xl bg-error/90 px-3 py-1">
                <Text className="text-xs font-black tracking-widest text-white">HẾT HÀNG</Text>
              </View>
            </View>
          )}
        </View>
        <View className="flex-1 justify-between bg-surface-50 p-3">
          <Text
            className="mb-2 text-body-base font-bold leading-tight text-surface-on"
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <View className="mt-2 flex-row items-end justify-between">
            <Text
              className={`text-body-sm font-semibold ${isOutOfStock ? 'text-error' : 'text-surface-on-variant'}`}
            >
              {isOutOfStock ? 'Hết hàng' : `Còn: ${item.stock}`}
            </Text>
            <Text className="text-title-sm font-black text-primary">
              {formatCurrency(item.price)}
            </Text>
          </View>
        </View>
      </Container>
    </Pressable>
  )
}

const MemoizedProductCard = memo(ProductCard, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.item.image === nextProps.item.image &&
    prevProps.item.isActive === nextProps.item.isActive &&
    prevProps.item.sku === nextProps.item.sku &&
    prevProps.item.barcode === nextProps.item.barcode &&
    prevProps.item.stock === nextProps.item.stock
  )
})

const enhance = withObservables(['item'], ({ item }) => ({
  item: item.observe(),
}))

export default enhance(MemoizedProductCard)
