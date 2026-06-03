import { Button, QuantityStepper } from '@/shared/components/ui'
import { ItemSnapshot } from '@/shared/lib/database/types'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { Check } from 'lucide-react-native'
import React, { memo } from 'react'
import { Pressable, Text, View } from 'react-native'

interface ExchangeReturnItemsPanelProps {
  items: ItemSnapshot[]
  isDraft: boolean
  isProcessing: boolean
  getLineQty: (productId: string) => number
  getLineAmount: (item: ItemSnapshot, qty: number) => number
  onToggleItem: (item: ItemSnapshot) => void
  onChangeQty: (item: ItemSnapshot, qty: number) => void
  onSelectAll: () => void
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
}: ExchangeReturnItemsPanelProps) {
  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between border-b border-outline-variant bg-[#f8fafc] px-8 py-5">
        <Text className="text-xl font-black uppercase tracking-widest text-surface-on">
          Hàng khách trả
        </Text>
        <Button
          label="Chọn tất cả"
          variant="outline"
          className="h-12 rounded-xl px-5"
          textClassName="text-sm font-black"
          onPress={onSelectAll}
          disabled={!isDraft || isProcessing}
        />
      </View>

      <View className="flex-row items-center border-b border-outline-variant bg-white px-8 py-4">
        <Text className="w-20 text-center text-xs font-black uppercase tracking-wider text-muted">
          Chọn
        </Text>
        <Text className="flex-1 text-xs font-black uppercase tracking-wider text-muted">
          Sản phẩm
        </Text>
        <Text className="w-24 text-center text-xs font-black uppercase tracking-wider text-muted">
          SL mua
        </Text>
        <Text className="w-40 text-center text-xs font-black uppercase tracking-wider text-muted">
          SL trả
        </Text>
        <Text className="w-36 text-right text-xs font-black uppercase tracking-wider text-muted">
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
            <View className="flex-row items-center border-b border-outline-variant px-8 py-5">
              <Pressable
                className={`h-11 w-11 items-center justify-center rounded-xl border-2 ${
                  isSelected ? 'border-primary bg-primary' : 'border-outline-variant bg-white'
                }`}
                onPress={() => onToggleItem(item)}
                disabled={!isDraft || isProcessing}
              >
                {isSelected && <Check size={24} color="white" strokeWidth={4} />}
              </Pressable>

              <View className="ml-5 flex-1">
                <Text className="text-xl font-black text-surface-on" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="mt-1 text-xs font-bold text-muted/60" numberOfLines={1}>
                  {item.sku}
                </Text>
              </View>

              <Text className="w-24 text-center text-xl font-black text-surface-on">
                x{item.quantity}
              </Text>

              <View className="w-40 items-center">
                <QuantityStepper
                  value={qty}
                  onChange={(nextQty) => onChangeQty(item, nextQty)}
                  disabled={!isDraft || isProcessing}
                  max={item.quantity}
                  editable={true}
                />
              </View>

              <Text className="w-36 text-right text-lg font-black text-error" numberOfLines={1}>
                {isSelected ? formatCurrency(lineAmount) : '-'}
              </Text>
            </View>
          )
        }}
      />
    </View>
  )
})
