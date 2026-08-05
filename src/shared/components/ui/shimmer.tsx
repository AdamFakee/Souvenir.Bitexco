import React from 'react'
import { View, ViewProps } from 'react-native'
import { cn } from '@/shared/utils/cn'

interface ShimmerProps extends ViewProps {
  className?: string
}

export function Shimmer({ className, style, ...props }: ShimmerProps) {
  return <View className={cn('bg-surface-300', className)} style={style} {...props} />
}
