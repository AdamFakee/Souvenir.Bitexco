import { COLORS } from '@/shared/constants'
import { cn } from '@/shared/utils'
import { Portal } from '@gorhom/portal'
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react-native'
import React, { useImperativeHandle, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut, Keyframe, ZoomIn, ZoomOut } from 'react-native-reanimated'
import { GlobalToast } from './global-toast'
import { IconButton } from './icon-button'

export interface PopupRef {
  open: () => void
  close: () => void
}

export type PopupType = 'success' | 'error' | 'warning' | 'info'

interface PopupProps {
  /** The primary heading of the popup */
  title: string
  /** The secondary description text */
  description?: string
  /** The predefined style of the popup (success, error, warning, info) */
  type?: PopupType
  /** An optional custom icon to display. If provided, overrides the type default icon. */
  icon?: React.ReactNode
  /** Background color for the icon container (e.g., 'bg-primary/10') */
  iconBgColor?: string
  /** Color for the icon itself. Only applies to default type icons. */
  iconColor?: string
  /** The animation type for the popup content. Default: 'fade' */
  animation?: 'fade' | 'zoom' | 'diagonal'
  /** Custom content, typically action buttons */
  children?: React.ReactNode
  /** Whether to show the close button in the top-right. Default: true */
  showCloseButton?: boolean
  /** Whether clicking the backdrop closes the popup. Default: true */
  dismissible?: boolean
  /** Optional callback when the popup is closed */
  onClose?: () => void
  /** React 19 ref prop */
  ref?: React.Ref<PopupRef>
}

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    color: '#10b981',
    bgColor: 'bg-green-50',
  },
  error: {
    icon: AlertCircle,
    color: COLORS.error.default,
    bgColor: 'bg-error-container',
  },
  warning: {
    icon: AlertTriangle,
    color: '#f59e0b',
    bgColor: 'bg-surface-200',
  },
  info: {
    icon: Info,
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
  },
}

/**
 * A generic, premium Popup component designed for Amber Ledger POS.
 */
const diagonalEntering = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ scale: 0 }, { translateX: -700 }, { translateY: 0 }],
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }, { translateX: 0 }, { translateY: 0 }],
  },
}).duration(1000)

const diagonalExiting = new Keyframe({
  0: {
    opacity: 1,
    transform: [{ scale: 1 }, { translateX: 0 }, { translateY: 0 }],
  },
  100: {
    opacity: 0,
    transform: [{ scale: 0 }, { translateX: -700 }, { translateY: 0 }],
  },
}).duration(500)

export const Popup = ({
  title,
  description,
  type,
  icon,
  iconBgColor,
  iconColor,
  animation = 'fade',
  children,
  showCloseButton = true,
  dismissible = true,
  onClose,
  ref,
}: PopupProps) => {
  const [visible, setVisible] = useState(false)

  useImperativeHandle(ref, () => ({
    open: () => setVisible(true),
    close: () => {
      setVisible(false)
      onClose?.()
    },
  }))

  const handleDismiss = () => {
    if (dismissible) {
      setVisible(false)
      onClose?.()
    }
  }

  // Calculate icon and colors
  const typeStyle = type ? TYPE_CONFIG[type] : null
  const finalIconBgColor = iconBgColor || typeStyle?.bgColor || 'bg-neutral-100'
  const finalIconColor = iconColor || typeStyle?.color || '#8c7166'

  const renderedIcon =
    icon ||
    (typeStyle &&
      React.createElement(typeStyle.icon, {
        size: 40,
        color: finalIconColor,
        strokeWidth: 2.5,
      }))

  let enteringAnim: any = FadeIn.duration(300)
  let exitingAnim: any = FadeOut.duration(200)

  if (animation === 'zoom') {
    enteringAnim = ZoomIn.duration(300)
    exitingAnim = ZoomOut.duration(200)
  } else if (animation === 'diagonal') {
    enteringAnim = diagonalEntering
    exitingAnim = diagonalExiting
  }

  if (!visible) return null

  return (
    <Portal hostName="modal">
      <View style={[StyleSheet.absoluteFill, { zIndex: 10000 }]}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <Pressable className="absolute inset-0" onPress={handleDismiss} />
          <Animated.View
            entering={enteringAnim}
            exiting={exitingAnim}
            className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-outline-variant/50 bg-white p-8 shadow-2xl"
          >
            {/* Close Button */}
            {showCloseButton && (
              <View className="absolute right-6 top-6 z-10">
                <IconButton
                  icon={X}
                  variant="xl"
                  color={COLORS.surface.on}
                  onPress={() => {
                    setVisible(false)
                    onClose?.()
                  }}
                />
              </View>
            )}

            {/* Header / Visual */}
            <View className="items-center py-2">
              {renderedIcon && (
                <View
                  className={cn(
                    'mb-6 h-20 w-20 items-center justify-center rounded-full',
                    finalIconBgColor,
                  )}
                >
                  {renderedIcon}
                </View>
              )}
              <Text
                className="mb-3 text-center text-2xl font-black text-surface-on"
                style={{ fontFamily: 'Manrope-Bold' }}
              >
                {title}
              </Text>
              {description && (
                <Text
                  className="text-center text-lg leading-relaxed text-muted"
                  style={{ fontFamily: 'Manrope-Medium' }}
                >
                  {description}
                </Text>
              )}
            </View>

            {/* Content / Buttons */}
            <View className="mt-8 gap-3">{children}</View>
          </Animated.View>
        </View>
        <GlobalToast />
      </View>
    </Portal>
  )
}

Popup.displayName = 'Popup'
