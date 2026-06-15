import { COLORS } from '@/shared/constants'
import { Toast as ToastType, useAlertStore } from '@/shared/store'
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react-native'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    accentColor: COLORS.success.default, // #00944a
    iconBg: COLORS.success.container, // #ecf1f4
    borderColor: COLORS.success.default,
  },
  error: {
    icon: AlertCircle,
    accentColor: COLORS.error.default, // #dd2027
    iconBg: COLORS.error.container, // #fef3f2
    borderColor: COLORS.error.default,
  },
  warning: {
    icon: AlertTriangle,
    accentColor: COLORS.warning.default, // #fb6514
    iconBg: COLORS.warning.container, // #fff4f2
    borderColor: COLORS.warning.default,
  },
  info: {
    icon: Info,
    accentColor: COLORS.info.default, // #2f6bff
    iconBg: COLORS.info.container, // #dbeafe
    borderColor: COLORS.info.default,
  },
}

const ToastItem = ({ toast }: { toast: ToastType }) => {
  const { hideToast } = useAlertStore()
  const config = TYPE_CONFIG[toast.type]
  const Icon = config.icon

  return (
    <Animated.View
      entering={SlideInRight.duration(350).springify()}
      exiting={SlideOutRight.duration(250)}
      style={[styles.card, { borderLeftColor: config.borderColor }]}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: config.iconBg }]}>
        <Icon size={22} color={config.accentColor} strokeWidth={2.2} />
      </View>

      {/* Text */}
      <View style={styles.textWrap}>
        {toast.title ? (
          <Text style={styles.title} numberOfLines={1}>
            {toast.title}
          </Text>
        ) : null}
        <Text style={[styles.message, !toast.title && styles.messageOnly]} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>

      {/* Close */}
      <Pressable onPress={() => hideToast(toast.id)} style={styles.closeBtn} hitSlop={8}>
        <X size={16} color={COLORS.neutral[400]} strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  )
}

export const GlobalToast = () => {
  const insets = useSafeAreaInsets()
  const { toasts } = useAlertStore()

  if (toasts.length === 0) return null

  return (
    <View pointerEvents="box-none" style={[styles.container, { top: insets.top + 16 }]}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 360,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface[50], // #ffffff
    borderLeftWidth: 4,
    // Figma border: #dfe0e1
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COLORS.outline.default,
    borderRightColor: COLORS.outline.default,
    borderBottomColor: COLORS.outline.default,
    // shadow
    shadowColor: 'rgba(15,23,42,0.10)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
    marginRight: 12,
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 4,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.neutral[900], // #0f0f0f
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  message: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.neutral[500], // #5b5b5c
    lineHeight: 18,
  },
  messageOnly: {
    color: COLORS.neutral[800],
    fontSize: 14,
  },
  closeBtn: {
    padding: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
