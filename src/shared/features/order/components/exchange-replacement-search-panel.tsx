import { EmptyState, LoadMore, SearchInput, Shimmer } from '@/shared/components/ui'
import { UnifiedProduct, useProductSearch } from '@/shared/features/pos/hooks/use-product-search'
import { useConnectionStore } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { SearchX } from 'lucide-react-native'
import React, { memo, useCallback, useState } from 'react'
import { Keyboard, Pressable, Text, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'

const BORDER = '#DFE0E1'
const TEXT_PRIMARY = '#303036'
const TEXT_MUTED = '#747475'
const BRAND = '#1C4E68'

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
      setSearchText('')
      Keyboard.dismiss()
      setTimeout(() => onSelectProduct(product), 60)
    },
    [onSelectProduct],
  )

  return (
    <View className="px-5 py-4" style={{ borderBottomWidth: 1, borderColor: BORDER }}>
      <Text
        className="mb-3 text-sm font-extrabold uppercase tracking-wider"
        style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
      >
        Hàng đổi mới
      </Text>

      <SearchInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Tìm tên sản phẩm, SKU hoặc quét barcode..."
        placeholderTextColor="#94a3b8"
        onClear={handleClear}
        autoCorrect={false}
        autoCapitalize="none"
        containerClassName="h-22 py-2 mb-1"
        editable={isDraft && !isProcessing}
      />

      {searchText.trim().length > 0 && (
        <View
          className="mt-2 overflow-hidden rounded-xl border bg-white shadow-lg"
          style={{ borderColor: BORDER, height: 360, elevation: 25, zIndex: 50 }}
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
                  className="flex-row items-center justify-between px-5 py-4 active:bg-gray-100"
                  style={{ borderBottomWidth: 0.5, borderColor: BORDER }}
                  disabled={!isDraft || isProcessing}
                >
                  <View className="flex-1">
                    <Text
                      className="text-lg font-extrabold"
                      style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      className="mt-0.5 text-sm font-bold"
                      style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
                      numberOfLines={1}
                    >
                      {item.sku}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text
                      className="text-lg font-extrabold"
                      style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
                      numberOfLines={1}
                    >
                      {formatCurrency(item.price)}
                    </Text>
                    <Text
                      className="mt-0.5 text-sm font-bold"
                      style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
                    >
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
  )
})
