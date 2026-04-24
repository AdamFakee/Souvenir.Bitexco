import React, { useEffect } from 'react'
import { FlatList, Image, SafeAreaView, Text, View } from 'react-native'
import IminViceScreen from '../../modules/imin-vice-screen'
import { Item, useViceStore } from './vice-store'

// --- MÀN HÌNH CHÍNH (GIỎ HÀNG) ---
function HomeScreen() {
  const { items, total, customerName, orderId } = useViceStore()

  const renderItem = ({ item }: { item: Item }) => (
    <View className="flex-row justify-between border-b border-[#F5F5F5] py-4">
      <Text className="flex-1 font-sans text-xl text-[#333]">
        {item.name} x{item.quantity}
      </Text>
      <Text className="ml-4 font-bold font-sans text-xl text-black">
        ${(item.price * item.quantity).toFixed(2)}
      </Text>
    </View>
  )

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="items-center rounded-bl-[24px] rounded-br-[24px] bg-primary p-8 shadow-lg shadow-black">
        <Text className="text-center font-bold text-4xl tracking-widest text-white">
          CHÀO MỪNG QUÝ KHÁCH
        </Text>
        <View className="mt-2 items-center">
          {customerName ? (
            <Text className="font-bold text-2xl text-yellow">Xin chào, {customerName}!</Text>
          ) : (
            <Text className="text-base text-white/80">Imin Swan 2 Secondary Screen</Text>
          )}
          {orderId ? (
            <Text className="mt-2 rounded-xl bg-black/20 px-3 py-1 font-mono text-sm text-white">
              Mã đơn: {orderId}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-1 p-6">
        {items.length > 0 ? (
          <View className="flex-1">
            <Text className="mb-4 border-b-2 border-[#F0F0F0] pb-2 font-bold text-xl text-[#333]">
              Chi tiết đơn hàng
            </Text>
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <View className="mb-8 items-center rounded-[20px] border-2 border-dashed border-primary bg-[#FFF8F8] p-8">
              <Text className="font-bold text-4xl text-primary">GIẢM GIÁ 20%</Text>
              <Text className="mt-2 text-lg text-[#666]">Cho đơn hàng đầu tiên</Text>
            </View>
            <Text className="text-center font-bold text-2xl text-[#999]">
              Vui lòng chọn món tại quầy
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View className="border-t border-[#EEE] bg-white p-8">
        <View className="flex-row items-center justify-between">
          <Text className="font-bold text-2xl text-[#666]">TỔNG CỘNG</Text>
          <Text className="font-bold text-5xl text-primary">${total.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  )
}

// --- MÀN HÌNH THANH TOÁN (QR) ---
function PaymentScreen() {
  const { qrCodeUrl, total } = useViceStore()
  return (
    <View className="flex-1 items-center justify-center bg-white p-8">
      <Text className="mb-6 font-bold text-2xl text-[#333]">QUÉT MÃ ĐỂ THANH TOÁN</Text>
      <View className="rounded-2xl border border-[#EEE] bg-white p-4 shadow-sm">
        <Image source={{ uri: qrCodeUrl }} className="h-[300px] w-[300px]" resizeMode="contain" />
      </View>
      <Text className="mt-6 font-bold text-5xl text-primary">${total.toFixed(2)}</Text>
      <Text className="mt-2 text-base text-[#666]">Hỗ trợ MoMo, VNPay, ZaloPay</Text>
    </View>
  )
}

// --- MÀN HÌNH QUẢNG CÁO (PROMOTION) ---
function PromotionScreen() {
  const { promoImageUrl } = useViceStore()
  return (
    <View className="flex-1 overflow-hidden rounded-[24px] bg-black">
      <Image
        source={{ uri: promoImageUrl }}
        className="h-full w-full opacity-80"
        resizeMode="cover"
      />
      <View className="absolute bottom-0 left-0 right-0 bg-black/40 p-8">
        <Text className="font-bold text-5xl text-white">Đặc sản hôm nay</Text>
        <Text className="mt-1 text-2xl text-yellow">Photography Collection</Text>
      </View>
    </View>
  )
}

export default function ViceApp() {
  const currentScreen = useViceStore((state) => state.currentScreen)
  const { updateCart, setCustomerName, setOrderId, showPayment, showPromo } = useViceStore()

  useEffect(() => {
    console.log('ViceApp mounted with Zustand')

    const subscription = IminViceScreen.addListener('onDataReceived', (event: any) => {
      console.log('Zustand ViceApp Event:', event)
      const { method, params } = event

      switch (method) {
        case 'updateCart':
          updateCart(params.items || [], params.total || 0)
          break
        case 'setCustomer':
          setCustomerName(params.name || '')
          break
        case 'setOrderId':
          setOrderId(params.orderId || '')
          break
        case 'showPayment':
          showPayment(params.qrCodeUrl)
          break
        case 'showPromo':
          showPromo(params.imageUrl)
          break
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-white">
      {currentScreen === 'Home' && <HomeScreen />}
      {currentScreen === 'Payment' && <PaymentScreen />}
      {currentScreen === 'Promotion' && <PromotionScreen />}
    </SafeAreaView>
  )
}
