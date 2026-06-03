import { EmptyState, LoadMore, SearchInput, Shimmer } from '@/shared/components/ui'
import { useProductSearch, UnifiedProduct } from '@/shared/features/pos/hooks/use-product-search'
import { useConnectionStore } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { SearchX } from 'lucide-react-native'
import React, { memo, useCallback, useState } from 'react'
import { Keyboard, Pressable, Text, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'

interface ExchangeReplacementSearchPanelProps {
  isDraft: boolean
  isProcessing: boolean
  onSelectProduct: (product: UnifiedProduct) => void
}

export const ExchangeReplacementSearchPanel = memo(function ExchangeReplacementSearchPanel({
  isDraft,
  isProcessing,
  onSelectProduct,
}: ExchangeReplacementSearchPanelProps) {
  const [searchText, setSearchText] = useState('')
  const isNetworkConnected = useConnectionStore((state) => state.isNetworkConnected)
  const effectiveSearchText = isNetworkConnected ? searchText : ''
  const { products, isLoading, isFetchingNextPage, loadMore } =
    useProductSearch(effectiveSearchText)

  const handleClear = useCallback(() => {
    setSearchText('')
    Keyboard.dismiss()
  }, [])

  const handleSelectProduct = useCallback(
    (product: UnifiedProduct) => {
      onSelectProduct(product)
      setSearchText('')
      Keyboard.dismiss()
    },
    [onSelectProduct],
  )

  return (
    <View className="relative z-20 border-b border-outline-variant bg-white px-8 py-5">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="text-xl font-black uppercase tracking-widest text-surface-on">
          Hàng đổi mới
        </Text>
        <Text className="text-sm font-black uppercase text-muted">Có hỗ trợ quét mã</Text>
      </View>

      <View className="mt-4">
        <SearchInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Tìm tên sản phẩm, SKU hoặc quét barcode..."
          placeholderTextColor="#94a3b8"
          onClear={handleClear}
          autoCorrect={false}
          autoCapitalize="none"
          editable={isDraft && !isProcessing}
        />

        {searchText.trim().length > 0 && (
          <View
            className="mt-2 overflow-hidden rounded-[28px] border border-outline-variant bg-surface-50 shadow-2xl"
            style={{ height: 360, elevation: 25 }}
          >
            {!isNetworkConnected ? (
              <EmptyState
                title="Không có kết nối mạng"
                description="Đổi hàng chỉ hỗ trợ khi online. Vui lòng kiểm tra lại kết nối."
                icon={SearchX}
                className="py-10"
              />
            ) : isLoading ? (
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
                renderItem={({ item }) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelectProduct(item)}
                    className="flex-row items-center justify-between border-b border-surface-200 px-6 py-5 active:bg-surface-100"
                    disabled={!isDraft || isProcessing}
                  >
                    <View className="flex-1">
                      <Text className="text-xl font-black text-surface-on" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text
                        className="mt-1 text-sm font-bold text-surface-on-variant"
                        numberOfLines={1}
                      >
                        {item.sku}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xl font-black text-primary" numberOfLines={1}>
                        {formatCurrency(item.price)}
                      </Text>
                      <Text className="mt-1 text-sm font-bold text-surface-on-variant">
                        Kho: {item.stock} {item.unitCode}
                      </Text>
                    </View>
                  </Pressable>
                )}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                scrollEnabled={true}
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={isFetchingNextPage ? <LoadMore isLoading /> : null}
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={true}
              />
            )}
          </View>
        )}
      </View>
    </View>
  )
})
