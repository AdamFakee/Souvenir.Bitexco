import { EmptyState, LoadMore, QuantityStepper, Shimmer } from '@/shared/components/ui'
import { useAppContext } from '@/shared/features/app/hooks/use-app-context'
import { UnifiedProduct } from '@/shared/features/pos/hooks/use-product-search'
import {
  PosLookupResult,
  ProductRemoteAPI,
} from '@/shared/features/product/api/remote/product.remote.api'
import { useConnectionStore } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { useInfiniteQuery } from '@tanstack/react-query'
import { PackageSearch } from 'lucide-react-native'
import React, { memo, useCallback, useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { ExchangeReplacementLine } from '../machines/exchange-order.machine'

const BORDER = '#DFE0E1'
const TEXT_PRIMARY = '#303036'
const TEXT_MUTED = '#747475'
const BRAND = '#1C4E68'
const ZEBRA = '#FAFAFB'
const PAGE_SIZE = 40

const toUnified = (r: PosLookupResult): UnifiedProduct => ({
  id: r.variantId,
  name: r.productName,
  sku: r.sku,
  price: r.price,
  stock: r.available,
  unitId: r.unitId,
  unitCode: r.unitCode,
  taxRate: r.taxRate ?? (r as any).tax_rate ?? 0,
  barcode: r.barcode,
})

interface ExchangeReplacementSearchPanelProps {
  isDraft: boolean
  isProcessing: boolean
  /** SKU các món trả đang chọn → GET /v1/pos/category?sku=A&sku=B */
  seedSkus: string[]
  suggestedUnitPrice?: number
  selectedLines: ExchangeReplacementLine[]
  onSelectProduct: (product: UnifiedProduct) => void
  onChangeQty: (variantId: string, qty: number) => void
  onRemoveItem: (variantId: string) => void
}

/** Một list: SP cùng category · multi-sku · pagination · tap chọn. */
export const ExchangeReplacementSearchPanel = memo(function ExchangeReplacementSearchPanel({
  isDraft,
  isProcessing,
  seedSkus,
  suggestedUnitPrice,
  selectedLines,
  onSelectProduct,
  onChangeQty,
  onRemoveItem,
}: ExchangeReplacementSearchPanelProps) {
  const isNetworkConnected = useConnectionStore((s) => s.isNetworkConnected)
  const { device } = useAppContext()
  const warehouseId = device?.warehouseId

  const skusKey = useMemo(
    () =>
      [...new Set(seedSkus.map((s) => s.trim()).filter(Boolean))].sort().join('|'),
    [seedSkus],
  )
  const skus = useMemo(
    () => (skusKey ? skusKey.split('|') : []),
    [skusKey],
  )
  const seedSkuSet = useMemo(() => new Set(skus), [skus])

  const categoryQuery = useInfiniteQuery({
    queryKey: ['exchange', 'category-by-sku', skusKey, warehouseId],
    queryFn: async ({ pageParam = 1 }) => {
      return ProductRemoteAPI.listCategoryBySku({
        skus,
        warehouseId,
        page: pageParam as number,
        limit: PAGE_SIZE,
      })
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: isNetworkConnected && skus.length > 0,
    staleTime: 30_000,
  })

  const products = useMemo(() => {
    const rows = categoryQuery.data?.pages.flatMap((p) => p.items) ?? []
    const seen = new Set<string>()
    const list: UnifiedProduct[] = []
    for (const r of rows) {
      if (r.isActive === false) continue
      if (seedSkuSet.has(r.sku)) continue
      if (seen.has(r.variantId)) continue
      seen.add(r.variantId)
      list.push(toUnified(r))
    }
    if (suggestedUnitPrice != null) {
      list.sort((a, b) => {
        const aEq = a.price === suggestedUnitPrice ? 0 : 1
        const bEq = b.price === suggestedUnitPrice ? 0 : 1
        return aEq - bEq
      })
    }
    return list
  }, [categoryQuery.data, seedSkuSet, suggestedUnitPrice])

  const selectedMap = useMemo(() => {
    const m = new Map<string, ExchangeReplacementLine>()
    selectedLines.forEach((l) => m.set(l.variantId, l))
    return m
  }, [selectedLines])

  const handlePress = useCallback(
    (product: UnifiedProduct) => {
      if (!isDraft || isProcessing) return
      if (selectedMap.has(product.id)) {
        onRemoveItem(product.id)
        return
      }
      onSelectProduct(product)
    },
    [isDraft, isProcessing, selectedMap, onSelectProduct, onRemoveItem],
  )

  return (
    <View className="min-h-0 flex-1 bg-white">
      <View
        className="flex-row items-center justify-between px-5 py-3"
        style={{ borderBottomWidth: 1, borderColor: BORDER, backgroundColor: ZEBRA }}
      >
        <Text
          className="text-sm font-extrabold uppercase tracking-wider"
          style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
        >
          Hàng đổi mới
        </Text>
      </View>

      {!isNetworkConnected ? (
        <EmptyState
          title="Không có kết nối mạng"
          description="Đổi hàng chỉ hỗ trợ khi online."
          icon={PackageSearch}
          className="py-16"
        />
      ) : skus.length === 0 ? (
        <EmptyState
          title="Chọn món trả bên trái"
          description="Chọn sản phẩm khách trả để hiện SP cùng danh mục."
          icon={PackageSearch}
          className="py-16"
        />
      ) : categoryQuery.isLoading ? (
        <View className="p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="mb-4 flex-row items-center justify-between">
              <View className="flex-1">
                <Shimmer className="h-5 w-48 rounded-lg" />
                <Shimmer className="mt-2 h-4 w-28 rounded-lg" />
              </View>
              <Shimmer className="h-5 w-20 rounded-lg" />
            </View>
          ))}
        </View>
      ) : products.length === 0 ? (
        <EmptyState
          title="Không có sản phẩm"
          description="Không có SP cùng danh mục với món đang trả."
          icon={PackageSearch}
          className="py-16"
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator
          contentContainerStyle={{ flexGrow: 1 }}
          onEndReached={() => {
            if (categoryQuery.hasNextPage && !categoryQuery.isFetchingNextPage) {
              categoryQuery.fetchNextPage()
            }
          }}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            categoryQuery.isFetchingNextPage ? <LoadMore isLoading /> : null
          }
          renderItem={({ item, index }) => {
            const selected = selectedMap.get(item.id)
            const samePrice = suggestedUnitPrice != null && item.price === suggestedUnitPrice
            const isEven = index % 2 === 1

            return (
              <Pressable
                onPress={() => handlePress(item)}
                disabled={!isDraft || isProcessing}
                className="flex-row items-center px-5 py-4 active:opacity-70"
                style={{
                  borderBottomWidth: 0.5,
                  borderColor: BORDER,
                  backgroundColor: selected ? 'rgba(28,78,104,0.06)' : isEven ? ZEBRA : '#fff',
                }}
              >
                <View className="min-w-0 flex-1 pr-3">
                  <Text
                    className="text-lg font-extrabold"
                    style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  <View className="mt-1 flex-row flex-wrap items-center gap-2">
                    <Text
                      className="text-sm font-bold"
                      style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
                    >
                      {item.sku}
                    </Text>
                    {samePrice && (
                      <Text
                        className="text-xs font-extrabold"
                        style={{ color: '#059669', fontFamily: 'Manrope-Bold' }}
                      >
                        Cùng giá
                      </Text>
                    )}
                  </View>
                </View>

                <View className="items-end">
                  <Text
                    className="text-lg font-extrabold"
                    style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
                  >
                    {formatCurrency(item.price)}
                  </Text>
                  {selected ? (
                    <View className="mt-2" onStartShouldSetResponder={() => true}>
                      <QuantityStepper
                        value={selected.qty}
                        onChange={(qty) => {
                          if (qty <= 0) onRemoveItem(item.id)
                          else onChangeQty(item.id, qty)
                        }}
                        disabled={!isDraft || isProcessing}
                        min={0}
                        max={item.stock > 0 ? item.stock : undefined}
                        editable
                      />
                    </View>
                  ) : (
                    <Text
                      className="mt-1 text-sm font-bold"
                      style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
                    >
                      Kho {item.stock}
                    </Text>
                  )}
                </View>
              </Pressable>
            )
          }}
        />
      )}
    </View>
  )
})
