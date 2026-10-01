import { Chip } from '@/shared/components/ui'
import React, { memo } from 'react'
import { ScrollView, View } from 'react-native'
import { usePosStore } from '../store/use-pos-store'

function CategoryRow() {
  const selectedCategoryId = usePosStore((state) => state.selectedCategoryId)
  const setSelectedCategoryId = usePosStore((state) => state.setSelectedCategoryId)

  return (
    <View className="shrink-0 flex-row items-center gap-sm overflow-x-auto pb-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chip
          label="TẤT CẢ SẢN PHẨM"
          active={selectedCategoryId === null}
          onPress={() => setSelectedCategoryId(null)}
          className="mr-3"
        />
      </ScrollView>
    </View>
  )
}

export default memo(CategoryRow)
