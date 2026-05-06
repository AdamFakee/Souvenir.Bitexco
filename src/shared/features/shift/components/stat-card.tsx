import { COLORS } from '@/shared/constants'
import React from 'react'
import { Text, View } from 'react-native'

interface StatCardProps {
  label: string
  value: string
  icon: any
  color: string
  description?: string
}

export function StatCard({ label, value, icon: Icon, color, description }: StatCardProps) {
  return (
    <View className="flex-1 rounded-[32px] border border-outline-variant bg-surface-50 p-10 shadow-sm">
      <View
        style={{ backgroundColor: `${color}15` }}
        className="mb-8 h-20 w-20 items-center justify-center rounded-3xl"
      >
        <Icon size={40} color={color} />
      </View>
      <Text className="text-2xl font-black uppercase tracking-widest text-surface-on-variant">
        {label}
      </Text>
      <Text className="mt-3 text-5xl font-black tracking-tighter text-surface-on">{value}</Text>
      {description && (
        <Text className="mt-4 text-xl font-bold text-surface-on-variant/50">{description}</Text>
      )}
    </View>
  )
}
