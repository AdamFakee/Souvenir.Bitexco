import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { LucideIcon, RotateCcw } from 'lucide-react-native'
import { cn } from '@/shared/utils'
import { EmptyBoxSvg } from './empty-box-svg'
import { EmptySearchSvg } from './empty-search-svg'
import { EmptyCartSvg } from './empty-cart-svg'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: LucideIcon
  illustration?: React.ReactNode
  variant?: 'box' | 'search' | 'cart'
  useIllustration?: boolean
  iconSize?: number
  actionLabel?: string
  onAction?: () => void
  children?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CONFIG = {
  sm: {
    container: 'py-2 px-4',
    iconWrap: 'mb-1 h-12 w-12',
    svgWidth: 130,
    svgHeight: 90,
    iconSize: 28,
    title: 'text-[15px] font-semibold text-slate-600 mt-0.5 px-2 text-center',
  },
  md: {
    container: 'py-4 px-6',
    iconWrap: 'mb-2 h-16 w-16',
    svgWidth: 170,
    svgHeight: 118,
    iconSize: 40,
    title: 'text-[17px] font-bold text-slate-700 mt-1 px-4 text-center',
  },
  lg: {
    container: 'py-6 px-8',
    iconWrap: 'mb-3 h-24 w-24',
    svgWidth: 220,
    svgHeight: 154,
    iconSize: 56,
    title: 'text-[20px] font-bold text-slate-800 mt-1.5 px-6 text-center',
  },
} as const

export const EmptyState = ({
  title,
  description,
  icon: Icon,
  illustration,
  variant = 'box',
  useIllustration = true,
  iconSize,
  actionLabel,
  onAction,
  children,
  className,
  size = 'md',
}: EmptyStateProps) => {
  const config = SIZE_CONFIG[size]
  const finalIconSize = iconSize ?? config.iconSize
  const SvgComponent =
    variant === 'search' ? EmptySearchSvg : variant === 'cart' ? EmptyCartSvg : EmptyBoxSvg

  return (
    <View className={cn('flex-1 items-center justify-center', config.container, className)}>
      {illustration ? (
        <View className="items-center justify-center">{illustration}</View>
      ) : useIllustration ? (
        <View className="items-center justify-center">
          <SvgComponent width={config.svgWidth} height={config.svgHeight} />
        </View>
      ) : (
        <View
          className={cn(
            'items-center justify-center rounded-full bg-neutral-100/80',
            config.iconWrap,
          )}
        >
          {Icon ? (
            <Icon size={finalIconSize} color="#A3A3A3" strokeWidth={1.5} />
          ) : (
            <View className="h-8 w-8 rounded-full bg-neutral-200 opacity-30" />
          )}
        </View>
      )}

      {title && <Text className={cn('text-center text-[#334155]', config.title)}>{title}</Text>}

      {children}

      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          className="mt-4 flex-row items-center gap-2 rounded-full border border-[#c5d5de] bg-[#ecf1f4] px-6 py-3 shadow-sm active:bg-[#dbe6eb]"
        >
          <RotateCcw size={16} color="#496C7E" strokeWidth={2.2} />
          <Text className="text-[15px] font-bold text-[#496C7E]">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  )
}
