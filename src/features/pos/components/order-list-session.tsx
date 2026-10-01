import { Button, EmptyState, IconButton, QuantityStepper } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { toast } from '@/shared/store/use-alert-store'
import { CartItem } from '@/shared/types'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { useSelector } from '@xstate/react'
import { Plus, Trash2, X } from 'lucide-react-native'
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ActorRefFrom } from 'xstate'
import { useActiveCart, usePosActor } from '../hooks'
import { cartMachine } from '../machines/cart.machine'
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
      <View className="h-[90px] flex-row items-center border-b border-surface-100 bg-white px-6">
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
      className="h-[52px] flex-row items-center rounded-full px-6"
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
  return <EmptyState variant="cart" size="md" />
})

// ─── Session Tabs Bar: độc lập, không re-render khi thêm món ───
const SessionTabBar = memo(function SessionTabBar({ onOpenAddTab }: { onOpenAddTab: () => void }) {
  const posActor = usePosActor()
  const cartTabs = useSelector(
    posActor!,
    (s) => {
      const tabMetas = s.context.tabMetas || {}
      const activeId = s.context.activeCartId
      const entries = Object.entries(tabMetas)

      const retailEntries = entries.filter(([, meta]) => !meta.affiliateName)
      const hasMultipleRetail = retailEntries.length > 1

      return entries.map(([id, meta]) => {
        let label = meta.affiliateName || meta.label || 'Khách lẻ'
        if (!meta.affiliateName && hasMultipleRetail) {
          const retailIndex = retailEntries.findIndex(([rid]) => rid === id)
          label = `Khách lẻ ${retailIndex + 1}`
        }
        return {
          id,
          label,
          isActive: id === activeId,
        }
      })
    },
    (prev, next) =>
      prev.length === next.length &&
      prev.every(
        (t, i) =>
          t.id === next[i].id && t.label === next[i].label && t.isActive === next[i].isActive,
      ),
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

  return (
    <View className="h-[68px] flex-row items-center border-b border-surface-100 bg-white px-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ gap: 10, alignItems: 'center' }}
      >
        {cartTabs.map(({ id, label, isActive }) => {
          return (
            <CartTabPill
              key={id}
              id={id}
              label={label}
              isActive={isActive}
              onSwitch={handleSwitchTab}
              onRemove={handleRemoveTab}
            />
          )
        })}
      </ScrollView>

      <Button
        label="Thêm phiên"
        leftIcon={Plus}
        iconSize={24}
        variant="outline"
        className="ml-3 h-[52px] rounded-full border-outline bg-surface-50 px-6 py-0"
        textClassName="text-[20px] font-bold text-neutral-600"
        onPress={onOpenAddTab}
      />
    </View>
  )
})

// ─── Session Search Bar: chứa ô tìm kiếm và nút xóa giỏ hàng ───
const SessionSearchBar = memo(function SessionSearchBar({
  cartActor,
}: {
  cartActor?: ActorRefFrom<typeof cartMachine>
}) {
  const hasItems = useSelector(cartActor!, (s) => Object.keys(s?.context?.items || {}).length > 0)

  const handleClearCart = useCallback(() => {
    toast.confirm({
      title: 'Xóa giỏ hàng',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?',
      onConfirm: () => cartActor?.send({ type: 'CLEAR_CART' }),
    })
  }, [cartActor])

  return (
    <View
      className="flex-row items-center justify-between border-b border-surface-100 bg-white px-6 py-4"
      style={{ zIndex: 50 }}
    >
      <ProductSearch />

      {hasItems && (
        <IconButton
          icon={Trash2}
          className="ml-4 h-12 w-12 rounded-xl bg-error/10"
          size={22}
          color={COLORS.error.default}
          onPress={handleClearCart}
        />
      )}
    </View>
  )
})

// ─── Cart Items Table: chỉ re-render khi items trong giỏ thay đổi ───
const CartTable = memo(function CartTable({
  cartActor,
}: {
  cartActor?: ActorRefFrom<typeof cartMachine>
}) {
  const items = useSelector(cartActor!, (s) => s?.context?.items || {})
  const cart = useMemo(() => Object.values(items || {}) as CartItem[], [items])

  const cartActorRef = useRef(cartActor)
  useEffect(() => {
    cartActorRef.current = cartActor
  }, [cartActor])

  const handleUpdateQuantity = useCallback(
    (productId: string, quantity: number) =>
      cartActorRef.current?.send({ type: 'UPDATE_QUANTITY', productId, quantity }),
    [],
  )

  const handleRemoveItem = useCallback(
    (productId: string) => cartActorRef.current?.send({ type: 'REMOVE_ITEM', productId }),
    [],
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

      <View className="flex-1">
        <FlashList
          data={cart}
          keyExtractor={(item) => item.product.id}
          renderItem={renderItem}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: cart.length === 0 ? 'center' : undefined,
          }}
          ListEmptyComponent={<CartEmptyState />}
        />
      </View>
    </View>
  )
})

// ─── Main OrderListSession Shell ───────────────────────────
export default function OrderListSession() {
  const posActor = usePosActor()
  const cartActor = useActiveCart()
  const addTabSheetRef = useRef<AddTabSheetRef>(null)

  const handleOpenAddTab = useCallback(() => {
    addTabSheetRef.current?.open()
  }, [])

  const handleAddTab = useCallback(
    (affiliate: any) => {
      posActor?.send({ type: 'ADD_TAB', affiliate: affiliate ?? undefined })
    },
    [posActor],
  )

  return (
    <View className="flex-1 flex-col bg-white">
      <SessionTabBar onOpenAddTab={handleOpenAddTab} />
      <SessionSearchBar cartActor={cartActor} />
      <CartTable cartActor={cartActor} />
      <AddTabSheet ref={addTabSheetRef} onSelect={handleAddTab} />
    </View>
  )
}
