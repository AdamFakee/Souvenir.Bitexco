import { EmptyState, LoadMore, SearchInput, Shimmer } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import { toast } from '@/shared/store'
import React, { memo, useCallback, useState } from 'react'
import { Keyboard, Pressable, Text, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { useDebounce } from 'use-debounce'
import { usePosActor, useProductSearch } from '../hooks'
import { UnifiedProduct } from '../hooks/use-product-search'

// ─── Memoized Item ───
const ProductItem = memo(function ProductItem({
  item: p,
  onSelect,
}: {
  item: UnifiedProduct
  onSelect: (product: UnifiedProduct) => void
}) {
  const priceAfterTax = Math.round(p.price)
  const taxRate = p.taxRate ?? 0
  const isOutOfStock = p.stock <= 0
  const isNoPrice =
    p.priceStatus === 'no_price' ||
    p.priceStatus === 'not_available' ||
    p.priceStatus === 'inactive'
  const isNotAvailable = isOutOfStock || p.isActive === false || isNoPrice

  const handlePress = useCallback(() => {
    if (isNotAvailable) {
      const errorMsg =
        p.isActive === false
          ? 'Sản phẩm đã ngừng kinh doanh!'
          : isNoPrice
            ? 'Sản phẩm chưa được cấu hình giá bán!'
            : 'Sản phẩm đã hết hàng trong kho!'
      toast.error(errorMsg, 'Không thể chọn')
      return
    }
    onSelect(p)
  }, [onSelect, p, isNotAvailable, isNoPrice])

  return (
    <Pressable
      onPress={handlePress}
      className={`flex-row items-center border-b border-surface-200 px-6 py-5 ${
        isNotAvailable ? 'bg-red-50 opacity-60' : 'active:bg-surface-100'
      }`}
    >
      <View style={{ flex: 3 }}>
        <Text className="text-[24px] font-bold text-surface-on" numberOfLines={2}>
          {p.name}
        </Text>
      </View>
      <View style={{ flex: 1.5 }} className="px-2">
        <Text className="text-[22px] font-medium text-black" numberOfLines={1}>
          {p.sku}
        </Text>
      </View>
      <View style={{ flex: 1 }} className="px-2">
        <Text
          className={`text-center text-[22px] font-bold ${isNotAvailable ? 'text-red-500' : 'text-black'}`}
          numberOfLines={1}
        >
          {isOutOfStock ? 'Hết hàng' : isNoPrice ? 'Chưa có giá' : p.stock}
        </Text>
      </View>
      <View style={{ flex: 1.5 }} className="items-end">
        <Text
          className={`text-right text-[26px] font-bold ${isNoPrice ? 'text-[20px] text-neutral-500' : 'text-primary'}`}
          numberOfLines={1}
        >
          {isNoPrice ? 'Chưa có giá' : formatCurrency(priceAfterTax)}
        </Text>
        {taxRate > 0 && !isNoPrice && (
          <Text className="mt-0.5 text-right text-[17px] font-medium text-neutral-500">
            VAT: {taxRate}%
          </Text>
        )}
      </View>
    </Pressable>
  )
})

export const ProductSearch = memo(function ProductSearch() {
  const posActor = usePosActor()
  const [localText, setLocalText] = useState('')
  const [debouncedText] = useDebounce(localText, 400)
  const { products, isLoading, isFetchingNextPage, loadMore } = useProductSearch(debouncedText)

  const isDebouncing = localText.trim() !== debouncedText.trim()
  const isSearching = isLoading || isDebouncing

  const handleSelectItem = useCallback(
    (product: UnifiedProduct) => {
      setLocalText('')
      Keyboard.dismiss()

      setTimeout(() => {
        posActor?.send({ type: 'ADD_ITEM', product: product as any })
      }, 50)
    },
    [posActor],
  )

  const handleClear = useCallback(() => {
    setLocalText('')
    Keyboard.dismiss()
  }, [])

  const renderProductItem = useCallback(
    ({ item }: { item: UnifiedProduct }) => <ProductItem item={item} onSelect={handleSelectItem} />,
    [handleSelectItem],
  )

  return (
    <View className="relative z-20 flex-1">
      <SearchInput
        value={localText}
        onChangeText={setLocalText}
        placeholder="Tìm tên sản phẩm hoặc SKU..."
        placeholderTextColor="#94a3b8"
        onClear={handleClear}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {localText.trim().length > 0 && (
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
              setLocalText('')
              Keyboard.dismiss()
            }}
          />

          <View
            className="absolute left-0 right-0 top-full z-[999] mt-2 overflow-hidden rounded-xl border border-outline-variant bg-surface-50 shadow-lg"
            style={{ height: 720, elevation: 10 }}
          >
            {isSearching ? (
              <View className="flex-1">
                <View className="flex-row items-center border-b border-surface-200 bg-surface-100 px-6 py-4">
                  <Shimmer className="h-6 w-24 rounded-lg" style={{ flex: 3 }} />
                  <Shimmer className="h-6 w-16 rounded-lg px-2" style={{ flex: 1.5 }} />
                  <Shimmer className="h-6 w-16 self-center rounded-lg px-2" style={{ flex: 1 }} />
                  <Shimmer className="h-6 w-20 rounded-lg text-right" style={{ flex: 1.5 }} />
                </View>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    className="flex-row items-center border-b border-surface-200 px-6 py-5"
                  >
                    <View style={{ flex: 3 }}>
                      <Shimmer className="h-7 w-48 rounded-lg" />
                    </View>
                    <View style={{ flex: 1.5 }} className="px-2">
                      <Shimmer className="h-6 w-24 rounded-lg" />
                    </View>
                    <View style={{ flex: 1 }} className="items-center px-2">
                      <Shimmer className="h-6 w-12 rounded-lg" />
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Shimmer className="h-7 w-20 self-end rounded-lg" />
                      <Shimmer className="mt-1 h-5 w-12 self-end rounded-lg" />
                    </View>
                  </View>
                ))}
              </View>
            ) : products.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <EmptyState title="Không tìm thấy sản phẩm phù hợp" variant="search" size="md" />
              </View>
            ) : (
              <View className="flex-1">
                <View className="flex-row items-center border-b border-surface bg-primary/25 px-6 py-4">
                  <Text className="text-[22px] font-bold text-neutral-600" style={{ flex: 3 }}>
                    Tên sản phẩm
                  </Text>
                  <Text
                    className="px-2 text-[22px] font-bold text-neutral-600"
                    style={{ flex: 1.5 }}
                  >
                    SKU
                  </Text>
                  <Text
                    className="px-2 text-center text-[22px] font-bold text-neutral-600"
                    style={{ flex: 1 }}
                  >
                    Tồn kho
                  </Text>
                  <Text
                    className="text-right text-[22px] font-bold text-neutral-600"
                    style={{ flex: 1.5 }}
                  >
                    Giá bán
                  </Text>
                </View>
                <FlatList
                  data={products}
                  renderItem={renderProductItem}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  onEndReached={loadMore}
                  onEndReachedThreshold={0.3}
                  style={{ marginBottom: 10 }}
                  ListFooterComponent={isFetchingNextPage ? <LoadMore isLoading /> : null}
                  contentContainerStyle={{ flexGrow: 1 }}
                  showsVerticalScrollIndicator={true}
                />
              </View>
            )}
          </View>
        </>
      )}
    </View>
  )
})
