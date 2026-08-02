import { Button, IconButton, QuantityStepper } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { useSelector } from '@xstate/react'
import { Plus, ShoppingBasket, Trash2, X } from 'lucide-react-native'
import React, { memo, useCallback, useMemo, useRef } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useActiveCart, usePosActor } from '../hooks'
import { CartItem } from '../types/cart.types'
import { AddTabSheet, AddTabSheetRef } from './add-tab-sheet'
import { ProductSearch } from './product-search'

type CartTab = { id: string; label: string; isActive: boolean }

// ─── Memoized CartItemRow: chỉ re-render khi item thay đổi ───
const CartItemRow = memo(
  function CartItemRow({
    item,
    index,
    onUpdateQuantity,
    onRemove,
  }: {
    item: CartItem
    index: number
    onUpdateQuantity: (productId: string, quantity: number) => void
    onRemove: (productId: string) => void
  }) {
    const itemTotal = Math.round(item.price * item.quantity)

    const handleQuantityChange = useCallback(
      (quantity: number) => onUpdateQuantity(item.product.id, quantity),
      [onUpdateQuantity, item.product.id],
    )

    const handleRemove = useCallback(() => onRemove(item.product.id), [onRemove, item.product.id])

    return (
      <View className="flex-row items-center border-b border-surface-100 bg-white px-6 py-5">
        <View className="w-[140px] text-center">
          <Text className=" pl-4 text-[20px] font-black text-surface-on-variant">{index + 1}</Text>
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-[24px] font-medium text-surface-on" numberOfLines={1}>
            {item.product.name}
          </Text>
          <Text className="mt-1 text-[18px] font-bold text-primary" numberOfLines={1}>
            {item.product.sku}
          </Text>
        </View>
        <Text
          className="w-[180px] text-center text-[22px] font-bold text-surface-on"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatCurrency(item.price)}
        </Text>
        <View className="w-[100px] items-center">
          <Text className="text-[20px] font-bold text-surface-on" numberOfLines={1}>
            {item.product.taxRate}%
          </Text>
        </View>
        <View className="w-[220px] items-center">
          <QuantityStepper
            value={item.quantity}
            onChange={handleQuantityChange}
            size="md"
            min={0}
            max={item.product.stock ?? undefined}
            editable={true}
          />
        </View>
        <Text
          className="w-[220px] pr-4 text-right text-[24px] font-black text-primary"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatCurrency(itemTotal)}
        </Text>
        <View className="w-16 items-center">
          <IconButton
            icon={Trash2}
            className="h-12 w-12 rounded-lg"
            size={22}
            color={COLORS.error.default}
            onPress={handleRemove}
          />
        </View>
      </View>
    )
  },
  (prev, next) =>
    prev.item.product.id === next.item.product.id &&
    prev.item.quantity === next.item.quantity &&
    prev.item.price === next.item.price &&
    prev.index === next.index &&
    prev.onUpdateQuantity === next.onUpdateQuantity &&
    prev.onRemove === next.onRemove,
)

// ─── Memoized CartTabPill: chỉ re-render khi tab này thay đổi ───
const CartTabPill = memo(function CartTabPill({
  id,
  label,
  isActive,
  onSwitch,
  onRemove,
}: CartTab & { onSwitch: (id: string) => void; onRemove: (id: string) => void }) {
  const handleSwitch = useCallback(() => onSwitch(id), [onSwitch, id])
  const handleRemove = useCallback(() => onRemove(id), [onRemove, id])
  return (
    <Pressable
      onPress={handleSwitch}
      className="flex-row items-center rounded-full px-6 py-3"
      style={{ backgroundColor: isActive ? COLORS.primary.default : COLORS.background.default }}
    >
      <Text
        className="text-[18px] font-bold"
        style={{ color: isActive ? COLORS.primary.on : COLORS.neutral[500] }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Pressable className="ml-2 rounded-full p-1" onPress={handleRemove} hitSlop={10}>
        <X size={22} color={isActive ? COLORS.primary.on : COLORS.neutral[400]} />
      </Pressable>
    </Pressable>
  )
})

const CartEmptyState = memo(function CartEmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-32">
      <ShoppingBasket size={80} color={COLORS.outline.variant} strokeWidth={1} />
      <Text className="mt-5 text-lg font-semibold text-surface-on-variant">Giỏ hàng trống</Text>
    </View>
  )
})

export default function OrderListSession() {
  const posActor = usePosActor()
  const cartActor = useActiveCart()
  const addTabSheetRef = useRef<AddTabSheetRef>(null)

  // Chỉ subscribe activeCartId + carts của active — không subscribe toàn bộ carts record
  const activeCartId = useSelector(posActor!, (s) => s.context.activeCartId)
  const items = useSelector(cartActor!, (s) => s?.context?.items || {})
  const cart = useMemo(() => Object.values(items || {}) as CartItem[], [items])

  // Subscribe riêng cho tab pills — chỉ lấy entries cần render
  const cartTabs = useSelector(posActor!, (s) => {
    const entries = Object.entries(s.context.carts)
    const activeId = s.context.activeCartId
    const sorted = entries.sort(([, a], [, b]) => {
      const sa = a.getSnapshot()
      const sb = b.getSnapshot()
      const aRetail = sa && !sa.context.affiliate
      const bRetail = sb && !sb.context.affiliate
      if (aRetail && !bRetail) return -1
      if (!aRetail && bRetail) return 1
      return 0
    })
    const tabs: CartTab[] = []
    const retailIds = sorted
      .filter(([, a]) => {
        const s = a.getSnapshot()
        return s && !s.context.affiliate
      })
      .map(([rid]) => rid)
    for (const [id, actor] of sorted) {
      const snapshot = actor.getSnapshot()
      if (!snapshot) continue
      const aff = snapshot.context.affiliate
      const label = aff
        ? aff.name
        : (() => {
            const pos = retailIds.indexOf(id)
            return pos >= 0 ? `Khách lẻ ${pos + 1}` : 'Khách lẻ'
          })()
      tabs.push({ id, label, isActive: id === activeId })
    }
    return tabs
  })

  const handleAddTab = useCallback(
    (affiliate: any) => {
      posActor?.send({ type: 'ADD_TAB', affiliate: affiliate ?? undefined })
    },
    [posActor],
  )

  const handleSwitchTab = useCallback(
    (id: string) => {
      posActor?.send({ type: 'SWITCH_TAB', id })
    },
    [posActor],
  )

  const handleRemoveTab = useCallback(
    (id: string) => {
      toast.confirm({
        title: 'Đóng phiên',
        message: 'Bạn có chắc chắn muốn đóng phiên này không?',
        onConfirm: () => posActor?.send({ type: 'REMOVE_TAB', id }),
      })
    },
    [posActor],
  )

  const handleClearCart = useCallback(() => {
    toast.confirm({
      title: 'Xóa giỏ hàng',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?',
      onConfirm: () => posActor?.send({ type: 'REMOVE_TAB', id: activeCartId! }),
    })
  }, [posActor, activeCartId])

  const handleUpdateQuantity = useCallback(
    (productId: string, quantity: number) =>
      cartActor?.send({ type: 'UPDATE_QUANTITY', productId, quantity }),
    [cartActor],
  )

  const handleRemoveItem = useCallback(
    (productId: string) => cartActor?.send({ type: 'REMOVE_ITEM', productId }),
    [cartActor],
  )

  const renderItem = useCallback(
    ({ item, index }: { item: CartItem; index: number }) => (
      <CartItemRow
        item={item}
        index={index}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemoveItem}
      />
    ),
    [handleUpdateQuantity, handleRemoveItem],
  )

  return (
    <View className="flex-1 flex-col bg-white">
      {/* Session Tabs — Pill Style */}
      <View className="flex-row items-center border-b border-surface-100 bg-white px-5 py-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ gap: 10 }}
        >
          {cartTabs.map(({ id, label, isActive }) => (
            <CartTabPill
              key={id}
              id={id}
              label={label}
              isActive={isActive}
              onSwitch={handleSwitchTab}
              onRemove={handleRemoveTab}
            />
          ))}
        </ScrollView>

        <Button
          label="Thêm phiên"
          leftIcon={Plus}
          iconSize={26}
          variant="outline"
          className="ml-3 h-[58px] rounded-full border-outline bg-surface-50 px-6 py-0"
          textClassName="text-[22px] font-bold text-neutral-600"
          onPress={() => addTabSheetRef.current?.open()}
        />
      </View>

      {/* Search Bar */}
      <View className="flex-row items-center justify-between border-b border-surface-100 bg-white px-6 py-4">
        <ProductSearch />

        {cart.length > 0 && (
          <IconButton
            icon={Trash2}
            className="ml-4 h-12 w-12 rounded-xl bg-error/10"
            size={22}
            color={COLORS.error.default}
            onPress={handleClearCart}
          />
        )}
      </View>

      {/* Cart Table */}
      <View className="flex-1 bg-white">
        {/* Table Header */}
        <View className="flex-row items-center border-b border-surface-200 bg-surface-50 px-6 py-4">
          <Text className="w-[140px] text-start text-[22px] font-black uppercase tracking-widest text-primary">
            STT
          </Text>
          <Text className="flex-1 text-[22px] font-black uppercase tracking-widest text-primary">
            Sản phẩm
          </Text>
          <Text className="w-[180px] text-center text-[22px] font-black uppercase tracking-widest text-primary">
            Đơn giá
          </Text>
          <Text className="w-[100px] text-center text-[22px] font-black uppercase tracking-widest text-primary">
            Thuế
          </Text>
          <Text className="w-[220px] text-center text-[22px] font-black uppercase tracking-widest text-primary">
            Số lượng
          </Text>
          <Text className="w-[220px] pr-4 text-right text-[22px] font-black uppercase tracking-widest text-primary">
            Thành tiền
          </Text>
          <View className="w-16" />
        </View>

        <FlashList
          data={cart}
          keyExtractor={(item) => item.product.id}
          renderItem={renderItem}
          ListEmptyComponent={<CartEmptyState />}
        />
      </View>

      {/* AddTab Sheet */}
      <AddTabSheet ref={addTabSheetRef} onSelect={handleAddTab} />
    </View>
  )
}
