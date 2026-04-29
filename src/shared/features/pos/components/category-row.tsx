import { Chip, Shimmer } from '@/shared/components/ui'
import { useCategories } from '@/shared/features/category'
import React, { memo } from 'react'
import { ScrollView, View } from 'react-native'
import { usePosStore } from '../store/use-pos-store'

function CategoryRow() {
  const { categories, isLoading } = useCategories()
  const selectedCategoryId = usePosStore((state) => state.selectedCategoryId)
  const setSelectedCategoryId = usePosStore((state) => state.setSelectedCategoryId)

  return (
    <View className="shrink-0 flex-row items-center gap-sm overflow-x-auto pb-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {isLoading ? (
          <View className="flex-row">
            <Shimmer className="mr-3 h-10 w-36 rounded-full" />
            <Shimmer className="mr-3 h-10 w-28 rounded-full" />
            <Shimmer className="mr-3 h-10 w-32 rounded-full" />
            <Shimmer className="mr-3 h-10 w-24 rounded-full" />
            <Shimmer className="mr-3 h-10 w-28 rounded-full" />
          </View>
        ) : (
          <>
            <Chip
              label="TẤT CẢ SẢN PHẨM"
              active={selectedCategoryId === null}
              onPress={() => setSelectedCategoryId(null)}
              className="mr-3"
            />
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name.toUpperCase()}
                active={selectedCategoryId === cat.id}
                onPress={() => setSelectedCategoryId(cat.id)}
                className="mr-3"
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  )
}

export default memo(CategoryRow)
