import { EmptyState, LoadMore, SearchInput, Shimmer } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import { SearchX } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { Keyboard, Pressable, Text, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { usePosActor, useProductSearch } from '../hooks'
import { UnifiedProduct } from '../hooks/use-product-search'

export function ProductSearch() {
  const posActor = usePosActor()
  const [searchText, setSearchText] = useState('')
  const { products, isLoading, isFetchingNextPage, loadMore } = useProductSearch(searchText)

  const handleSelectItem = useCallback(
    (product: UnifiedProduct) => {
      setSearchText('')
      Keyboard.dismiss()

      // Defer sending ADD_ITEM to prevent blocking the keyboard slide-down and dropdown unmount transitions
      setTimeout(() => {
        posActor?.send({ type: 'ADD_ITEM', product: product as any })
      }, 50)
    },
    [posActor],
  )

  const handleClear = useCallback(() => {
    setSearchText('')
    Keyboard.dismiss()
  }, [])

  const renderProductItem = useCallback(
    ({ item: p }: { item: UnifiedProduct }) => {
      // Đơn giá từ backend đã bao gồm thuế (Tax-inclusive)
      const taxRate = p.taxRate ?? 0
      const priceAfterTax = Math.round(p.price)
      return (
        <Pressable
          key={p.id}
          onPress={() => handleSelectItem(p)}
          className="flex-row items-center justify-between border-b border-surface-200 px-6 py-5 active:bg-surface-100"
        >
          <View className="flex-1">
            <Text className="text-[20px] font-bold text-surface-on">{p.name}</Text>
            <Text className="mt-1 text-[17px] font-medium text-surface-on-variant">{p.sku}</Text>
          </View>
          <View className="items-end">
            <Text className="text-[22px] font-bold text-primary" numberOfLines={1}>
              {formatCurrency(priceAfterTax)}
            </Text>
            <Text className="mt-1 text-[15px] text-surface-on-variant">
              Kho: {p.stock} {p.unitCode}
              {taxRate > 0 ? ` · VAT ${taxRate}%` : ''}
            </Text>
          </View>
        </Pressable>
      )
    },
    [handleSelectItem],
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
            className="absolute left-0 right-0 top-full z-[999] mt-2 overflow-hidden rounded-xl border border-outline-variant bg-surface-50 shadow-lg"
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
