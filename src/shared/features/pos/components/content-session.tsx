import { EmptyState, LoadingIndicator, LoadMore } from '@/shared/components/ui'
import { useCategories } from '@/shared/features/category'
import { useProducts } from '@/shared/features/product'
import { ProductModel } from '@/shared/lib/database/models'
import { FlashList } from '@shopify/flash-list'
import { ShoppingBasket } from 'lucide-react-native'
import React from 'react'
import { Text, View } from 'react-native'
import { useCartStore } from '../store'
import { usePosStore } from '../store/use-pos-store'
import CategoryRow from './category-row'
import ProductCard from './product-card'

export default function ContentSession() {
  const addItem = useCartStore((state) => state.addItem)
  const selectedCategoryId = usePosStore((state) => state.selectedCategoryId)

  const addToCart = (product: ProductModel) => {
    addItem(product, 1)
  }
  const searchQuery = usePosStore((state) => state.searchQuery)

  const { categories } = useCategories()

  const { products, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useProducts({
    categoryId: selectedCategoryId,
    searchQuery,
  })

  const categoryName = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)?.name
    : 'Tất cả sản phẩm'

  return (
    <View className="flex-1 gap-4 overflow-hidden bg-surface-100 p-4">
      <CategoryRow />

      {/* Grid Title & Item Count */}
      <View className="flex-row items-center justify-between px-2">
        <Text className="text-title-sm font-extrabold text-surface-on">{categoryName}</Text>
        <Text className="text-body-sm font-semibold text-surface-on-variant">
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
          numColumns={3}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage()
            }
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<LoadMore isLoading={isFetchingNextPage} />}
          renderItem={({ item }) => <ProductCard item={item} addToCart={addToCart} />}
        />
      )}
    </View>
  )
}
