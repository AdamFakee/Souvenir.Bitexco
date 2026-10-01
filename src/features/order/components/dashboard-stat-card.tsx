import React from 'react'
import { Text, View } from 'react-native'

interface DashboardStatCardProps {
  label: string
  value: string
  icon: any
  iconBgColor: string
  iconColor: string
  isCompact?: boolean
}

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  iconBgColor,
  iconColor,
}: DashboardStatCardProps) {
  return (
    <View
      style={{ backgroundColor: '#ffffff' }}
      className="flex-1 flex-row items-center gap-6 rounded-[32px] border border-outline-variant p-8 shadow-sm"
    >
      <View
        style={{ backgroundColor: iconBgColor, width: 64, height: 64 }}
        className="items-center justify-center rounded-2xl"
      >
        <Icon size={32} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-xl font-bold uppercase tracking-widest text-surface-on-variant">
          {label}
        </Text>
        <Text className="mt-1 text-4xl font-black tracking-tighter text-surface-on">{value}</Text>
      </View>
    </View>
  )
}
