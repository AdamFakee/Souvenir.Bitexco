import { COLORS } from '@/shared/constants'
import { Toast as ToastType, useAlertStore } from '@/shared/store/use-alert-store'
import { Portal } from '@gorhom/portal'
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react-native'
import React, { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    accentColor: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#10B981',
    textColor: '#064E3B',
    titleColor: '#065F46',
    iconBg: '#D1FAE5',
  },
  error: {
    icon: AlertCircle,
    accentColor: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#EF4444',
    textColor: '#7F1D1D',
    titleColor: '#991B1B',
    iconBg: '#FEE2E2',
  },
  warning: {
    icon: AlertTriangle,
    accentColor: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#F59E0B',
    textColor: '#78350F',
    titleColor: '#92400E',
    iconBg: '#FEF3C7',
  },
  info: {
    icon: Info,
    accentColor: COLORS.info.default,
    bgColor: '#EFF6FF',
    borderColor: '#3B82F6',
    textColor: '#1E3A8A',
    titleColor: '#1E40AF',
    iconBg: '#DBEAFE',
  },
}

const ToastItem = ({ toast }: { toast: ToastType }) => {
  const { hideToast } = useAlertStore()
  const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info
  const Icon = config.icon

  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start()
  }, [anim])

  const handleDismiss = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      hideToast(toast.id)
    })
  }

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-70, 0],
  })

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  })

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
        {
          opacity: anim,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: config.iconBg }]}>
        <Icon size={28} color={config.accentColor} strokeWidth={2.5} />
      </View>

      {/* Text */}
      <View style={styles.textWrap}>
        {toast.title ? (
          <Text style={[styles.title, { color: config.titleColor }]} numberOfLines={1}>
            {toast.title}
          </Text>
        ) : null}
        <Text
          style={[styles.message, { color: config.textColor }, !toast.title && styles.messageOnly]}
          numberOfLines={3}
        >
          {toast.message}
        </Text>
      </View>

      {/* Close */}
      <Pressable onPress={handleDismiss} style={styles.closeBtn} hitSlop={10}>
        <X size={22} color={config.accentColor} strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  )
}

export const GlobalToast = () => {
  const insets = useSafeAreaInsets()
  const { toasts } = useAlertStore()

  if (toasts.length === 0) return null

  return (
    <Portal>
      <View pointerEvents="box-none" style={[styles.container, { top: insets.top + 16 }]}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </View>
    </Portal>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 680,
    minHeight: 76,
    marginBottom: 12,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 2,
    shadowColor: 'rgba(15,23,42,0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  message: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  messageOnly: {
    fontSize: 19,
    lineHeight: 26,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
})
