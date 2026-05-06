import { EmptyState, LoadMore, Shimmer } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { ProductModel } from '@/shared/lib/database/models'
import { formatCurrency } from '@/shared/utils'
import { Search, SearchX } from 'lucide-react-native'
import React, { useState } from 'react'
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useProductSearch } from '../hooks'
import { useCartStore } from '../store'

export function ProductSearch() {
  const { addItem } = useCartStore()
  const [searchText, setSearchText] = useState('')
  const { products, isLoading, isFetchingNextPage, loadMore } = useProductSearch(searchText)

  const handleSelectItem = (product: ProductModel) => {
    addItem(product)
    setSearchText('')
    Keyboard.dismiss()
  }

  return (
    <View className="relative z-20 flex-1">
      <View className="h-14 flex-row items-center rounded-full border border-outline-variant bg-[#f1f5f9] px-6 focus:border-primary">
        <Search size={22} color={COLORS.outline.variant} />
        <TextInput
          className="ml-4 flex-1 text-lg text-surface-on"
          placeholder="Search product name or SKU..."
          placeholderTextColor="#94a3b8"
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* Search Autocomplete / Loading */}
      {searchText.trim().length > 0 && (
        <View
          className="absolute left-0 right-0 top-full z-[999] mt-2 rounded-2xl border border-outline-variant bg-surface-50 shadow-2xl "
          style={{ maxHeight: 400, elevation: 10 }}
        >
          {isLoading ? (
            <View className="p-2">
              {[1, 2, 3].map((i) => (
                <View key={i} className="flex-row items-center justify-between p-4">
                  <View className="flex-1">
                    <Shimmer className="h-6 w-48 rounded-lg" />
                    <Shimmer className="mt-2 h-4 w-32 rounded-lg" />
                  </View>
                  <Shimmer className="h-6 w-24 rounded-lg" />
                </View>
              ))}
            </View>
          ) : products.length === 0 ? (
            <EmptyState
              title="Không tìm thấy sản phẩm"
              description={`Không tìm thấy kết quả cho "${searchText}"`}
              icon={SearchX}
              className="py-10"
            />
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              onScrollEndDrag={loadMore} // hoặc bỏ nếu không cần load more
            >
              {products.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => handleSelectItem(p)}
                  className="flex-row items-center justify-between border-b border-surface-200 px-6 py-4 active:bg-surface-100"
                >
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-surface-on">{p.nameEn}</Text>
                    <Text className="text-sm text-surface-on-variant">{p.sku}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-bold text-primary">
                      {formatCurrency(p.price)}
                    </Text>
                    <Text className="text-xs font-medium text-surface-on-variant">
                      Kho: {p.stock} {p.unit}
                    </Text>
                  </View>
                </Pressable>
              ))}
              {isFetchingNextPage && <LoadMore isLoading />}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  )
}
