import React, { ComponentType, ReactNode, useEffect, useState } from 'react'
import { InteractionManager, Text, View } from 'react-native'
import { Shimmer } from './shimmer'

// ============================================================
// Shell + Deferred Render pattern cho tab nặng
//
//   InteractionManager.runAfterInteractions đợi cho đến khi toàn bộ
//   native animation/gesture (bao gồm tab transition) hoàn tất
//   mới render content → tránh jank khi chuyển tab
// ============================================================

interface LazyTabShellProps {
  Content: ComponentType
  title?: string
  accentColor?: string
  header?: ReactNode
  skeleton?: ReactNode
  backgroundColor?: string
}

export function LazyTabShell({
  Content,
  title,
  accentColor = '#3b82f6',
  header,
  skeleton,
  backgroundColor = '#f8fafc',
}: LazyTabShellProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => setReady(true))
    return () => handle.cancel()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {header ??
        (title ? (
          <View
            style={{
              height: 56,
              backgroundColor: accentColor,
              justifyContent: 'center',
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{title}</Text>
          </View>
        ) : null)}
      {ready ? <Content /> : (skeleton ?? <DefaultSkeleton />)}
    </View>
  )
}

function DefaultSkeleton() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          marginBottom: 16,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#fff',
          elevation: 2,
        }}
      >
        <Shimmer className="h-[120px]" />
        <View style={{ padding: 12 }}>
          <Shimmer className="mb-2 h-3.5 w-[70%] rounded" />
          <Shimmer className="h-3 w-[50%] rounded" />
        </View>
      </View>
      <View
        style={{
          marginBottom: 16,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#fff',
          elevation: 2,
        }}
      >
        <Shimmer className="h-20" />
        <View style={{ padding: 12 }}>
          <Shimmer className="mb-2 h-3.5 w-[60%] rounded" />
          <Shimmer className="h-3 w-[40%] rounded" />
        </View>
      </View>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="mb-3 flex-row items-center">
          <Shimmer className="mr-3 h-11 w-11 rounded-full" />
          <View style={{ flex: 1 }}>
            <Shimmer className="mb-1.5 h-3.5 w-[55%] rounded" />
            <Shimmer className="h-2.5 w-[35%] rounded" />
          </View>
        </View>
      ))}
    </View>
  )
}

LazyTabShell.displayName = 'LazyTabShell'
