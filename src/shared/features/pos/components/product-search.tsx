import { EmptyState, LoadMore, SearchInput, Shimmer } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import { SearchX } from 'lucide-react-native'
import React, { useState } from 'react'
import { Keyboard, Pressable, Text, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { usePosActor, useProductSearch } from '../hooks'
import { UnifiedProduct } from '../hooks/use-product-search'

export function ProductSearch() {
  const posActor = usePosActor()
  const [searchText, setSearchText] = useState('')
  const { products, isLoading, isFetchingNextPage, loadMore } = useProductSearch(searchText)

  const handleSelectItem = (product: UnifiedProduct) => {
    posActor?.send({ type: 'ADD_ITEM', product: product as any })
    setSearchText('')
    Keyboard.dismiss()
  }

  const handleClear = () => {
    setSearchText('')
    Keyboard.dismiss()
  }

  const renderProductItem = ({ item: p }: { item: UnifiedProduct }) => (
    <Pressable
      key={p.id}
      onPress={() => handleSelectItem(p)}
      className="flex-row items-center justify-between border-b border-surface-200 px-10 py-8 active:bg-surface-100"
    >
      <View className="flex-1">
        <Text className="text-2xl font-black text-surface-on">{p.name}</Text>
        <Text className="mt-1 text-lg font-bold text-surface-on-variant">{p.sku}</Text>
      </View>
      <View className="items-end">
        <Text className="text-2xl font-black text-primary" numberOfLines={1}>
          {formatCurrency(p.price)}
        </Text>
        <Text className="mt-1 text-base font-bold text-surface-on-variant">
          Kho: {p.stock} {p.unitCode}
        </Text>
      </View>
    </Pressable>
  )

  return (
    <View className="relative z-20 flex-1">
      <SearchInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Tìm tên sản phẩm hoặc SKU..."
        placeholderTextColor="#94a3b8"
        onClear={handleClear}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {/* Search Autocomplete / Loading */}
      {searchText.trim().length > 0 && (
        <>
          {/* Backdrop to close when clicking outside */}
          <Pressable
            style={{
              position: 'absolute',
              top: -500,
              left: -500,
              right: -1500,
              bottom: -1500,
            }}
            onPress={() => {
              setSearchText('')
              Keyboard.dismiss()
            }}
          />

          <View
            className="absolute left-0 right-0 top-full z-[999] mt-2 overflow-hidden rounded-[32px] border border-outline-variant bg-surface-50 shadow-2xl"
            style={{ maxHeight: 650, elevation: 25 }}
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
              <FlatList
                data={products}
                renderItem={renderProductItem}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={isFetchingNextPage ? <LoadMore isLoading /> : null}
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={true}
              />
            )}
          </View>
        </>
      )}
    </View>
  )
}
