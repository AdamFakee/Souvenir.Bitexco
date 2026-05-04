// import { COLORS } from '@/shared/constants'
// import { ProductModel } from '@/shared/lib/database/models'
// import { Search } from 'lucide-react-native'
// import React, { useCallback, useEffect, useRef, useState } from 'react'
// import { Keyboard, Text, TextInput, TouchableOpacity, View } from 'react-native'
// import { useDebounce } from 'use-debounce'
// import { useCartStore } from '../store'
// import { usePosStore } from '../store/use-pos-store'

// export default function HeaderSession() {
//   const searchQuery = usePosStore((state) => state.searchQuery)
//   const setSearchQuery = usePosStore((state) => state.setSearchQuery)

//   const [text, setText] = useState(searchQuery)
//   const [debouncedText] = useDebounce(text, 300)

//   const dropdownRef = useRef<SearchDropdownRef>(null)

//   const addItem = useCartStore((state) => state.addItem)

//   useEffect(() => {
//     setSearchQuery(debouncedText)
//   }, [debouncedText, setSearchQuery])

//   useEffect(() => {
//     if (searchQuery !== text) {
//       setText(searchQuery)
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [searchQuery])

//   return (
//     <View style={{ zIndex: 1000 }} pointerEvents="box-none">
//       {/* Thanh Header chính (bị giới hạn chiều cao h-16) */}
//       <View
//         className="h-16 flex-row items-center justify-between border-b border-outline-variant bg-surface-50 px-6 shadow-sm"
//         style={{ elevation: 5 }}
//       >
//         <View className="flex-1 flex-row items-center">
//           <View className="w-[450px]">
//             <View className="h-11 flex-row items-center rounded-xl border border-outline-variant bg-surface-200 px-4">
//               <Search size={20} color={COLORS.outline.default} />
//               <TextInput
//                 className="ml-3 flex-1 text-body-base text-surface-on"
//                 placeholder="Tìm sản phẩm, SKU hoặc quét barcode..."
//                 placeholderTextColor={COLORS.outline.default}
//                 value={text}
//                 onChangeText={setText}
//                 onFocus={() => dropdownRef.current?.open()}
//               />
//               {text.length > 0 && (
//                 <TouchableOpacity
//                   onPress={() => {
//                     setText('')
//                     setSearchQuery('')
//                     Keyboard.dismiss()
//                     dropdownRef.current?.close()
//                   }}
//                   className="p-2"
//                 >
//                   <Search size={20} color="transparent" />
//                   <View className="absolute inset-0 items-center justify-center">
//                     <Text className="text-lg font-bold text-surface-on-variant">×</Text>
//                   </View>
//                 </TouchableOpacity>
//               )}
//             </View>
//           </View>
//         </View>
//       </View>

//       {/* Dropdown được đưa ra ngoài để không bị giới hạn touch bởi h-16 */}
//       <View
//         style={{ position: 'absolute', top: 64, left: 24, zIndex: 9999 }}
//         pointerEvents="box-none"
//       >
//         <SearchDropdown
//           ref={dropdownRef}
//           onSelectItem={handleAddItem}
//         />
//       </View>
//     </View>
//   )
// }
