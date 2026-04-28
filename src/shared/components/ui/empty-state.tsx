import React from 'react'
import { View, Text } from 'react-native'
import { LucideIcon } from 'lucide-react-native'
import { cn } from '@/shared/utils'
import { Button } from './button'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  actionLabel?: string
  onAction?: () => void
  children?: React.ReactNode
  className?: string
}

export const EmptyState = ({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  children,
  className,
}: EmptyStateProps) => {
  return (
    <View className={cn('flex-1 items-center justify-center px-10 py-20', className)}>
      <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-neutral-50">
        {Icon ? (
          <Icon size={40} color="#D4D4D4" strokeWidth={1.5} />
        ) : (
          <View className="h-10 w-10 rounded-full bg-neutral-200 opacity-20" />
        )}
      </View>

      <Text className="text-center text-lg font-black text-secondary">{title}</Text>

      {description && (
        <Text className="mt-2 text-center text-sm font-medium leading-5 text-neutral-400">
          {description}
        </Text>
      )}

      {children}

      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          className="mt-8 min-w-[160px] px-8"
        />
      )}
    </View>
  )
}
