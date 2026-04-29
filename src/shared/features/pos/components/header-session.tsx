import { COLORS } from '@/shared/constants'
import { Search } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { TextInput, View } from 'react-native'
import { useDebounce } from 'use-debounce'
import { usePosStore } from '../store/use-pos-store'

export default function HeaderSession() {
  const searchQuery = usePosStore((state) => state.searchQuery)
  const setSearchQuery = usePosStore((state) => state.setSearchQuery)

  const [text, setText] = useState(searchQuery)
  const [debouncedText] = useDebounce(text, 300)

  useEffect(() => {
    setSearchQuery(debouncedText)
  }, [debouncedText, setSearchQuery])

  useEffect(() => {
    if (searchQuery !== text) {
      setText(searchQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  return (
    <View className="z-30 h-16 flex-row items-center justify-between border-b border-outline-variant bg-surface-50 px-6 shadow-sm">
      <View className="flex-1 flex-row items-center">
        <View className="h-[70%] w-96 flex-row items-center rounded-xl border border-outline-variant bg-surface-200 px-4">
          <Search size={20} color={COLORS.outline.default} />
          <TextInput
            className="ml-2 flex-1 text-body-sm text-xs text-surface-on"
            placeholder="Tìm sản phẩm, SKU hoặc quét barcode..."
            placeholderTextColor={COLORS.outline.default}
            value={text}
            onChangeText={setText}
          />
        </View>
      </View>
    </View>
  )
}
