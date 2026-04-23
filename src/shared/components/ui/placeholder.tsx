import { cn } from '@/shared/utils/cn'
import React from 'react'
import { Text, View, ViewProps } from 'react-native'

interface PlaceholderProps extends ViewProps {
  text?: string
  className?: string
}

export const Placeholder = ({ text, className, style, ...props }: PlaceholderProps) => {
  return (
    <View
      className={cn('h-full w-full items-center justify-center bg-gray-800', className)}
      style={[{ backgroundColor: '#374151', width: '100%', height: '100%' }, style]}
      {...props}
    >
      {text && (
        <Text
          style={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: 24,
            textAlign: 'center',
          }}
        >
          {text}
        </Text>
      )}
    </View>
  )
}
