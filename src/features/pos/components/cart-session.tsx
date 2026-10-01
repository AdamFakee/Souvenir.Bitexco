// import { Button, IconButton } from '@/shared/components/ui'
// import { COLORS } from '@/shared/constants'
// import { useAuthStore } from '@/features/auth'
// import {
//   CashPaymentPopup,
//   QrPaymentPopup,
//   PaymentPopupRef,
// } from '@/features/payment'
// import { toast } from '@/shared/store/use-alert-store'
// import { formatCurrency } from '@/shared/utils'
// import { FlashList } from '@shopify/flash-list'
// import {
//   Banknote,
//   CreditCard,
//   Minus,
//   Plus,
//   QrCode,
//   ShoppingBasket,
//   Trash2,
//   X,
// } from 'lucide-react-native'
// import React, { useMemo, useRef } from 'react'
// import { Pressable, ScrollView, Text, View } from 'react-native'
// import { useCartStore } from '../store'

// export default function CartSession() {
//   const {
//     sessions,
//     activeSessionId,
//     createNewSession,
//     removeSession,
//     setActiveSession,
//     updateQuantity,
//     removeItem,
//     removeCurrentCart,
//   } = useCartStore()

//   const { isOfflineMode } = useAuthStore()
//   const cashPopupRef = useRef<PaymentPopupRef>(null)
//   const qrPopupRef = useRef<PaymentPopupRef>(null)

//   const handleCashCheckout = () => {
//     toast.success(`Thanh toán thành công!`)
//     removeCurrentCart()
//   }

//   const handleQrCheckout = () => {
//     toast.success(`Thanh toán thành công!`)
//     removeCurrentCart()
//   }

//   const handleCardCheckout = () => {
//     toast.success(`Thanh toán thành công!`)
//     removeCurrentCart()
//   }

//   const activeSession = activeSessionId ? sessions[activeSessionId] : null
//   const cart = useMemo(() => {
//     return activeSession ? Object.values(activeSession.items) : []
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [activeSession?.items])
//   const discount = activeSession?.discount || 0

//   const subtotal = useMemo(() => {
//     return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
//   }, [cart])

//   const total = useMemo(() => {
//     return Math.max(0, subtotal - discount)
//   }, [subtotal, discount])

//   return (
//     <View className="w-[30%] flex-col justify-between border-l border-outline-variant bg-surface-50">
//       {/* Session Tabs */}
//       <View className="flex-row items-center border-b border-outline-variant bg-surface-100">
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           className="flex-1"
//           showsVerticalScrollIndicator={false}
//         >
//           <View className="flex-row gap-2 p-2">
//             {Object.values(sessions).map((session) => {
//               const isActive = session.id === activeSessionId
//               const itemCount = Object.values(session.items).reduce(
//                 (sum, item) => sum + item.quantity,
//                 0,
//               )

//               return (
//                 <Pressable
//                   key={session.id}
//                   onPress={() => setActiveSession(session.id)}
//                   className={`flex-row items-center rounded-t-xl border-x border-t px-4 py-2 ${
//                     isActive
//                       ? 'border-b-0 border-outline-variant bg-surface-50'
//                       : 'border-transparent bg-surface-200'
//                   }`}
//                   style={
//                     isActive
//                       ? { borderBottomColor: COLORS.surface[50], marginBottom: -1, zIndex: 10 }
//                       : {}
//                   }
//                 >
//                   <Text
//                     className={`mr-2 text-body-sm font-bold ${isActive ? 'text-primary' : 'text-surface-on-variant'}`}
//                   >
//                     {session.name}
//                   </Text>
//                   {itemCount > 0 && (
//                     <View className="mr-2 rounded-full bg-primary px-1.5 py-0.5">
//                       <Text className="text-[10px] font-bold text-primary-on">{itemCount}</Text>
//                     </View>
//                   )}
//                   <IconButton
//                     icon={X}
//                     size={14}
//                     color={isActive ? COLORS.error.default : COLORS.outline.default}
//                     className="h-5 w-5 bg-transparent"
//                     hitSlop={8}
//                     onPress={() => {
//                       toast.confirm({
//                         title: 'Hủy đơn',
//                         message: `Bạn có chắc chắn muốn hủy ${session.name} không?`,
//                         onConfirm: () => removeSession(session.id),
//                       })
//                     }}
//                   />
//                 </Pressable>
//               )
//             })}
//           </View>
//         </ScrollView>
//         <View className="border-l border-outline-variant bg-surface-200 p-1.5">
//           <IconButton
//             icon={Plus}
//             size={20}
//             color={COLORS.primary.default}
//             onPress={() => createNewSession()}
//           />
//         </View>
//       </View>

//       {/* Cart Header */}
//       <View className="flex-row items-center justify-between border-b border-outline-variant p-4">
//         <View className="flex-1 flex-row items-center justify-end">
//           <ShoppingBasket size={24} color={COLORS.primary.default} />
//           <Text className="ml-2 text-title-sm font-bold text-surface-on">Giỏ hàng</Text>
//         </View>
//       </View>

//       {/* Cart Items List */}
//       {cart.length === 0 ? (
//         <View className="flex-1 items-center justify-center">
//           <ShoppingBasket size={48} color={COLORS.outline.variant} />
//           <Text className="mt-2 text-body-sm text-surface-on-variant">Giỏ hàng đang trống</Text>
//           {!activeSessionId && (
//             <Text className="mt-2 text-body-sm text-primary">Nhấn + để tạo đơn mới</Text>
//           )}
//         </View>
//       ) : (
//         <FlashList
//           data={cart}
//           keyExtractor={(item) => item.product.id}
//           className="flex-1"
//           contentContainerStyle={{ paddingVertical: 8 }}
//           renderItem={({ item }) => (
//             <View className="flex-row items-center justify-between border-b border-surface-200 px-4 py-3">
//               <View className="flex-1 pr-2">
//                 <Text className="text-body-sm font-semibold text-surface-on" numberOfLines={2}>
//                   {item.product.name}
//                 </Text>
//                 <Text className="mt-1 text-body-sm font-bold text-primary">
//                   {formatCurrency(item.product.price)}
//                 </Text>
//               </View>
//               <View className="flex-row items-center">
//                 <View className="mr-2 flex-row items-center rounded-full border border-outline-variant bg-surface-100">
//                   <IconButton
//                     icon={Minus}
//                     size={16}
//                     color={COLORS.outline.default}
//                     className="p-2"
//                     onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
//                   />
//                   <Text className="px-2 text-body-sm font-bold text-surface-on">
//                     {item.quantity}
//                   </Text>
//                   <IconButton
//                     icon={Plus}
//                     size={16}
//                     color={COLORS.outline.default}
//                     className="p-2"
//                     onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
//                   />
//                 </View>
//                 <IconButton
//                   icon={Trash2}
//                   size={16}
//                   color={COLORS.error.default}
//                   className="bg-error/10 p-2"
//                   onPress={() => removeItem(item.product.id)}
//                 />
//               </View>
//             </View>
//           )}
//         />
//       )}

//       {/* Cart Summary */}
//       <View className="border-t border-outline-variant bg-surface-100 p-4">
//         <View className="mb-2 flex-row justify-between">
//           <Text className="text-body-sm text-surface-on-variant">Tạm tính:</Text>
//           <Text className="text-body-sm font-semibold text-surface-on">
//             {formatCurrency(subtotal)}
//           </Text>
//         </View>

//         <Pressable
//           className="mb-3 flex-row justify-between border-b border-dashed border-outline-variant pb-2"
//           disabled={true}
//         >
//           <Text className="text-body-sm font-semibold text-primary">Giảm giá (-):</Text>
//           <Text className="text-body-sm font-bold text-primary">
//             {discount > 0 ? `-${formatCurrency(discount)}` : '0 đ'}
//           </Text>
//         </Pressable>

//         <View className="mb-4 flex-row items-center justify-between">
//           <Text className="text-title-sm font-extrabold text-surface-on">Tổng tiền:</Text>
//           <Text className="text-headline-md font-black text-primary">{formatCurrency(total)}</Text>
//         </View>

//         {/* Actions */}
//         <View className="flex-row gap-2">
//           <Button
//             label="Hủy"
//             variant="error"
//             leftIcon={Trash2}
//             className="flex-1"
//             disabled={cart.length === 0}
//             onPress={() => {
//               if (cart.length > 0) {
//                 toast.confirm({
//                   title: 'Hủy đơn',
//                   message: 'Bạn có chắc chắn muốn hủy đơn này không?',
//                   onConfirm: removeCurrentCart,
//                 })
//               }
//             }}
//           />
//         </View>

//         {/* Thanh toán trực tiếp */}
//         <View className="mt-3 flex-row gap-2">
//           <Button
//             label="Tiền mặt"
//             variant="primary"
//             leftIcon={Banknote}
//             className="flex-1 shadow-sm"
//             disabled={cart.length === 0}
//             onPress={() => cashPopupRef.current?.open()}
//           />
//         </View>
//         <View className="mt-2 flex-row gap-2">
//           <Button
//             label="QRCode"
//             variant="outline"
//             leftIcon={QrCode}
//             className="flex-1 shadow-sm"
//             disabled={cart.length === 0 || isOfflineMode}
//             onPress={() => qrPopupRef.current?.open()}
//           />
//           <Button
//             label="Thẻ"
//             variant="outline"
//             leftIcon={CreditCard}
//             className="flex-1 shadow-sm"
//             disabled={cart.length === 0}
//             onPress={handleCardCheckout}
//           />
//         </View>
//       </View>

//       <CashPaymentPopup ref={cashPopupRef} total={total} onSuccess={handleCashCheckout} />

//       <QrPaymentPopup
//         ref={qrPopupRef}
//         total={total}
//         activeSessionId={activeSessionId}
//         onSuccess={handleQrCheckout}
//       />
//     </View>
//   )
// }
