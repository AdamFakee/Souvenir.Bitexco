import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { StyleSheet, ViewProps } from 'react-native'

interface GradientBackgroundProps extends ViewProps {
  children: React.ReactNode
  className?: string
}

export const GradientBackground = ({ children, style, ...props }: GradientBackgroundProps) => {
  return (
    <LinearGradient
      colors={['#FFE149', '#F72B2B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
      {...props}
    >
      {children}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
