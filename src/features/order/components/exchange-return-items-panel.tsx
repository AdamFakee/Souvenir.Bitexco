import { Checkbox, QuantityStepper } from '@/shared/components/ui'
import { ItemSnapshot } from '@/shared/lib/database/types'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import React, { memo, useCallback, useMemo } from 'react'
import { Text, View } from 'react-native'

interface ExchangeReturnItemsPanelProps {
  items: ItemSnapshot[]
  isDraft: boolean
  isProcessing: boolean
  getLineQty: (productId: string) => number
  getLineAmount: (item: ItemSnapshot, qty: number) => number
  onToggleItem: (item: ItemSnapshot) => void
  onChangeQty: (item: ItemSnapshot, qty: number) => void
  onSelectAll: () => void
  onClearAll: () => void
}

export const ExchangeReturnItemsPanel = memo(function ExchangeReturnItemsPanel({
  items,
  isDraft,
  isProcessing,
  getLineQty,
  getLineAmount,
  onToggleItem,
  onChangeQty,
  onSelectAll,
  onClearAll,
}: ExchangeReturnItemsPanelProps) {
  const allSelected = useMemo(() => {
    if (!items || items.length === 0) return false
    return items.every((item) => getLineQty(item.productId) > 0)
  }, [items, getLineQty])

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      onClearAll()
    } else {
      onSelectAll()
    }
  }, [allSelected, onSelectAll, onClearAll])

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center border-b border-surface-200 bg-surface-50 px-6 py-[14px]">
        <Text className="text-[16px] font-bold uppercase tracking-widest text-surface-on-variant">
          Hàng khách trả
        </Text>
      </View>

      <View className="flex-row items-center border-b border-surface-200 bg-white px-[10px] py-[14px]">
        <View className="w-[78px] items-center justify-center">
          <Checkbox
            checked={allSelected}
            onChange={handleToggleAll}
            disabled={!isDraft || isProcessing}
          />
        </View>
        <Text className="flex-1 text-[17px] font-bold uppercase tracking-widest text-surface-on-variant">
          Sản phẩm
        </Text>
        <Text className="w-[120px] text-center text-[17px] font-bold uppercase tracking-widest text-surface-on-variant">
          SL mua
        </Text>
        <Text className="w-[194px] text-center text-[17px] font-bold uppercase tracking-widest text-surface-on-variant">
          SL trả
        </Text>
        <Text className="w-[145px] pr-2 text-right text-[17px] font-bold uppercase tracking-widest text-surface-on-variant">
          Giá trị
        </Text>
      </View>

      <FlashList<ItemSnapshot>
        data={items}
        keyExtractor={(item, index) => item.productId || index.toString()}
        renderItem={({ item }) => {
          const qty = getLineQty(item.productId)
          const isSelected = qty > 0
          const lineAmount = getLineAmount(item, qty)

          return (
            <View className="flex-row items-center border-b border-surface-100 bg-white px-[10px] py-[18px]">
              <View className="w-[78px] items-center justify-center">
                <Checkbox
                  checked={isSelected}
                  onChange={() => onToggleItem(item)}
                  disabled={!isDraft || isProcessing}
                />
              </View>
              <View className="ml-5 flex-1 pr-2">
                <Text className="text-[19px] font-bold text-surface-on" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text
                  className="mt-0.5 text-[16px] font-medium text-surface-on-variant"
                  numberOfLines={1}
                >
                  {item.sku}
                </Text>
              </View>
              <Text className="w-[120px] text-center text-[19px] font-bold text-surface-on">
                x{item.quantity}
              </Text>
              <View className="w-[194px] items-center">
                <QuantityStepper
                  value={qty}
                  onChange={(nextQty) => onChangeQty(item, nextQty)}
                  disabled={!isDraft || isProcessing}
                  max={item.quantity}
                  editable={true}
                />
              </View>
              <Text
                className="w-[145px] pr-2 text-right text-[19px] font-bold text-error"
                numberOfLines={1}
              >
                {isSelected ? formatCurrency(lineAmount) : '-'}
              </Text>
            </View>
          )
        }}
      />
    </View>
  )
})
