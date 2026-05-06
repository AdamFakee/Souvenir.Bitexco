import { Button, IconButton } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { ProductLocalAPI } from '@/shared/features/product'
import { ProductModel } from '@/shared/lib/database/models'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import { Minus, Plus, Search, ShoppingBasket, Trash2, X } from 'lucide-react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useDebounce } from 'use-debounce'
import { useCartStore } from '../store'

export default function OrderListSession() {
  const {
    sessions,
    activeSessionId,
    createNewSession,
    removeSession,
    setActiveSession,
    updateQuantity,
    removeItem,
    addItem,
  } = useCartStore()

  const [searchText, setSearchText] = useState('')
  const [debouncedSearch] = useDebounce(searchText, 300)
  const [searchResults, setSearchResults] = useState<ProductModel[]>([])

  const activeSession = activeSessionId ? sessions[activeSessionId] : null
  const cart = useMemo(() => {
    return activeSession ? Object.values(activeSession.items) : []
  }, [activeSession?.items])

  useEffect(() => {
    if (debouncedSearch.trim()) {
      handleSearch(debouncedSearch)
    } else {
      setSearchResults([])
    }
  }, [debouncedSearch])

  const handleSearch = async (query: string) => {
    const products = await ProductLocalAPI.getProducts({ searchQuery: query, limit: 10 })
    setSearchResults(products)
  }

  const handleSelectItem = (product: ProductModel) => {
    addItem(product)
    setSearchText('')
    setSearchResults([])
    Keyboard.dismiss()
  }

  return (
    <View className="flex-1 flex-col bg-surface-50">
      {/* Session Tabs */}
      <View className="flex-row items-center border-b border-[#e2e8f0] bg-[#f1f5f9] px-6">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
          <View className="flex-row gap-2 pt-3">
            {Object.values(sessions).map((session) => {
              const isActive = session.id === activeSessionId
              const itemCount = Object.values(session.items).reduce(
                (sum, item) => sum + item.quantity,
                0,
              )

              return (
                <Pressable
                  key={session.id}
                  onPress={() => setActiveSession(session.id)}
                  className={`min-w-[160px] flex-row items-center rounded-t-xl border-x border-t px-6 py-4 ${
                    isActive ? 'border-[#e2e8f0] bg-white' : 'border-transparent bg-[#e2e8f0]'
                  }`}
                  style={
                    isActive
                      ? {
                          borderBottomWidth: 1,
                          borderBottomColor: '#ffffff',
                          marginBottom: -1,
                          zIndex: 10,
                        }
                      : {}
                  }
                >
                  <Text
                    className={`flex-1 text-base font-bold ${
                      isActive ? 'text-surface-on' : 'text-muted'
                    }`}
                    numberOfLines={1}
                  >
                    {session.name}
                  </Text>

                  {itemCount > 0 && (
                    <View className="mx-3 rounded-full bg-primary/10 px-2.5 py-1">
                      <Text className="text-[12px] font-bold text-primary">{itemCount}</Text>
                    </View>
                  )}

                  <Pressable
                    className="ml-2 h-7 w-7 items-center justify-center rounded-full active:bg-error/10"
                    onPress={() => {
                      toast.confirm({
                        title: 'Hủy đơn',
                        message: `Bạn có chắc chắn muốn hủy ${session.name} không?`,
                        onConfirm: () => removeSession(session.id),
                      })
                    }}
                  >
                    <X size={18} color={isActive ? '#94a3b8' : '#64748b'} />
                  </Pressable>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>

        <Button
          label="Add Tab"
          leftIcon={Plus}
          iconSize={20}
          variant="outline"
          className="ml-4 h-11 rounded-xl border-[#e2e8f0] bg-white px-5"
          textClassName="text-sm font-bold text-[#64748b]"
          onPress={() => createNewSession()}
        />
      </View>

      {/* POS Header with Search */}
      <View className="relative z-20 flex-row items-center justify-between border-b border-outline-variant bg-white px-8 py-5">
        <View className="relative flex-1">
          <View className="h-14 flex-row items-center rounded-full border border-outline-variant bg-[#f1f5f9] px-6 focus:border-primary">
            <Search size={22} color="#64748b" />
            <TextInput
              className="ml-4 flex-1 text-lg text-surface-on"
              placeholder="Search product name or scan barcode (SKU)..."
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* Search Autocomplete */}
          {searchResults.length > 0 && (
            <View className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-outline-variant bg-surface-50 shadow-2xl">
              <ScrollView className="max-h-96">
                {searchResults.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => handleSelectItem(p)}
                    className="flex-row items-center justify-between border-b border-surface-200 px-6 py-4 active:bg-surface-100"
                  >
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-surface-on">{p.name}</Text>
                      <Text className="text-sm text-surface-on-variant">{p.sku}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-lg font-bold text-primary">
                        {formatCurrency(p.price)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <IconButton
          icon={Trash2}
          size={24}
          color={COLORS.error.default}
          className={`ml-5 h-14 w-14 rounded-2xl bg-error/10 ${cart.length === 0 ? 'hidden' : ''}`}
          onPress={() => {
            toast.confirm({
              title: 'Xóa giỏ hàng',
              message: 'Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?',
              onConfirm: () => useCartStore.getState().removeCurrentCart(),
            })
          }}
        />
      </View>

      {/* Cart Table */}
      <View className="flex-1 overflow-hidden bg-white">
        {/* Table Header */}
        <View className="flex-row items-center border-b-2 border-outline-variant bg-[#f1f5f9] px-6 py-4">
          <Text className="w-16 text-sm font-bold uppercase text-muted">No.</Text>
          <Text className="w-32 text-sm font-bold uppercase text-muted">SKU</Text>
          <Text className="flex-1 text-sm font-bold uppercase text-muted">Product Name</Text>
          <Text className="w-40 text-center text-sm font-bold uppercase text-muted">Price</Text>
          <Text className="w-40 text-center text-sm font-bold uppercase text-muted">Tax</Text>
          <Text className="w-40 text-center text-sm font-bold uppercase text-muted">Qty</Text>
          <Text className="w-40 pr-6 text-right text-sm font-bold uppercase text-muted">Total</Text>
          <View className="w-16" />
        </View>

        <ScrollView className="flex-1">
          {cart.length === 0 ? (
            <View className="flex-1 items-center justify-center p-32">
              <ShoppingBasket size={80} color={COLORS.outline.variant} strokeWidth={1} />
              <Text className="mt-6 text-xl font-medium text-surface-on-variant">
                Cart is empty
              </Text>
            </View>
          ) : (
            cart.map((item, index) => {
              const taxRate = 8
              const taxAmount = ((item.price * taxRate) / 100) * item.quantity
              const itemTotal = item.price * item.quantity
              return (
                <View
                  key={item.product.id}
                  className="flex-row items-center border-b border-outline-variant px-6 py-5 active:bg-surface-100"
                >
                  <Text className="w-16 text-base font-medium text-surface-on-variant">
                    {index + 1}
                  </Text>
                  <Text className="w-32 text-base font-medium text-surface-on-variant">
                    {item.product.sku}
                  </Text>
                  <Text className="flex-1 text-base font-bold text-surface-on">
                    {item.product.name}
                  </Text>
                  <Text className="w-40 text-center text-base font-medium text-surface-on">
                    {formatCurrency(item.price)}
                  </Text>
                  <Text className="w-40 text-center text-xs text-surface-on-variant">
                    {taxRate}% / {formatCurrency(taxAmount)}
                  </Text>
                  <View className="w-40 items-center">
                    <View className="flex-row items-center self-center rounded-xl border border-outline-variant bg-surface-200">
                      <IconButton
                        icon={Minus}
                        size={20}
                        color={COLORS.surface.on}
                        className="p-3"
                        onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                      />
                      <Text className="w-20 text-center text-xl font-bold text-surface-on">
                        {item.quantity}
                      </Text>
                      <IconButton
                        icon={Plus}
                        size={20}
                        color={COLORS.surface.on}
                        className="p-3"
                        onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                      />
                    </View>
                  </View>
                  <Text className="w-40 pr-6 text-right text-lg font-bold text-primary">
                    {formatCurrency(itemTotal)}
                  </Text>
                  <View className="w-16 items-center justify-center">
                    <IconButton
                      icon={Trash2}
                      size={24}
                      color={COLORS.error.default}
                      className="bg-transparent opacity-50"
                      onPress={() => removeItem(item.product.id)}
                    />
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>
      </View>
    </View>
  )
}
