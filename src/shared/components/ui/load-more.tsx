import React from 'react'
import { View } from 'react-native'
import { LoadingIndicator } from './loading'

interface LoadMoreProps {
  isLoading: boolean
}

export const LoadMore = ({ isLoading }: LoadMoreProps) => {
  if (!isLoading) return null

  return (
    <View className="items-center justify-center py-4">
      <LoadingIndicator />
    </View>
  )
}
