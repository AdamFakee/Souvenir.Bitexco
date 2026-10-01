import { EmptyState, LoadingIndicator, LoadMore, ModalBase } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useProducts } from '@/features/product'
import { ProductModel } from '@/shared/lib/database/models'
import { FlashList } from '@shopify/flash-list'
import { ShoppingBasket, X } from 'lucide-react-native'
import React, { useCallback, useImperativeHandle, useState } from 'react'
import { Dimensions, Text, TouchableOpacity, View } from 'react-native'
import { useActiveCart } from '../hooks'
import { usePosStore } from '../store/use-pos-store'
import CategoryRow from './category-row'
import ProductCard from './product-card'

export interface ProductSearchModalRef {
  open: () => void
  close: () => void
}

interface ProductSearchModalProps {
  ref?: React.Ref<ProductSearchModalRef>
}

const ItemSeparator = () => <View style={{ width: 16, height: 16 }} />

export function ProductSearchModal({ ref }: ProductSearchModalProps) {
  const [visible, setVisible] = useState(false)

  useImperativeHandle(ref, () => ({
    open: () => setVisible(true),
    close: () => setVisible(false),
  }))

  const cartActor = useActiveCart()
  const selectedCategoryId = usePosStore((state) => state.selectedCategoryId)
  const searchQuery = usePosStore((state) => state.searchQuery)

  const addToCart = useCallback(
    (product: ProductModel) => {
      cartActor?.send({ type: 'ADD_ITEM', product })
      setVisible(false)
    },
    [cartActor],
  )

  const { products, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useProducts({
    categoryId: selectedCategoryId,
    searchQuery,
  })

  const categoryName = 'Tất cả sản phẩm'

  const renderProductCard = useCallback(
    ({ item }: { item: ProductModel }) => <ProductCard item={item} addToCart={addToCart} />,
    [addToCart],
  )

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <ModalBase
      visible={visible}
      onClose={() => setVisible(false)}
      className="absolute bottom-0 w-full rounded-b-none rounded-t-3xl bg-surface-100"
    >
      <View
        className="flex-1 flex-col overflow-hidden"
        style={{ height: Dimensions.get('screen').height * 0.9 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-outline-variant bg-surface-50 p-4">
          <Text className="text-2xl font-bold text-surface-on">Danh sách sản phẩm</Text>
          <TouchableOpacity
            onPress={() => setVisible(false)}
            className="rounded-full bg-surface-200 p-2"
          >
            <X size={24} color={COLORS.surface.on} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 p-4">
          <View className="mb-4">
            <CategoryRow />
          </View>

          {/* Grid Title & Item Count */}
          <View className="mb-2 flex-row items-center justify-between px-2">
            <Text className="text-title-sm font-extrabold text-surface-on">{categoryName}</Text>
            <Text className="text-body-base font-semibold text-surface-on-variant">
              {products.length} món
            </Text>
          </View>

          {/* Product Grid Cards */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <LoadingIndicator size="large" />
            </View>
          ) : products.length === 0 ? (
            <EmptyState title="Không tìm thấy sản phẩm nào" icon={ShoppingBasket} />
          ) : (
            <FlashList
              data={products}
              keyExtractor={(item) => item.id}
              numColumns={6}
              ItemSeparatorComponent={ItemSeparator}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.3}
              ListFooterComponent={<LoadMore isLoading={isFetchingNextPage} />}
              renderItem={renderProductCard}
            />
          )}
        </View>
      </View>
    </ModalBase>
  )
}
