import { COLORS, SHADOW } from '@/shared/constants'
import { formatDateTime } from '@/shared/utils'
import * as Haptics from 'expo-haptics'
import { AlertTriangle, BellRing, Check, Clock, X } from 'lucide-react-native'
import React, { useEffect } from 'react'
import { Modal, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { Button } from '@/shared/components/ui/button'
import { IconButton } from '@/shared/components/ui/icon-button'
import { useNoteStore } from '../store/use-note-store'

export function HandoverReminderOverlay() {
  const { notes, activeReminderId, toggleComplete, snoozeReminder, setActiveReminderId } =
    useNoteStore()

  const activeNote = notes.find((n) => n.id === activeReminderId)

  // Animation rung chuông báo thức
  const rotation = useSharedValue(0)

  const bellStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    }
  })

  useEffect(() => {
    if (activeNote) {
      // Rung máy khi chuông reo
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)

      // Chạy hiệu ứng lắc chuông
      rotation.value = withRepeat(
        withSequence(
          withTiming(-15, { duration: 100 }),
          withTiming(15, { duration: 100 }),
          withTiming(0, { duration: 100 }),
        ),
        8, // Lặp lại 8 lần
        true,
      )
    }
  }, [activeReminderId])

  if (!activeNote) return null

  const handleMarkCompleted = () => {
    toggleComplete(activeNote.id)
    setActiveReminderId(null)
  }

  const handleSnooze = () => {
    snoozeReminder(activeNote.id, 5) // Nhắc lại sau 5 phút
  }

  const handleClose = () => {
    setActiveReminderId(null)
  }

  return (
    <Modal visible={true} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/60 px-8">
        <View
          className="w-full max-w-[760px] rounded-[32px] border border-outline-variant bg-white p-9"
          style={SHADOW.lg}
        >
          {/* Header */}
          <View className="mb-6 items-center">
            <Animated.View
              style={bellStyle}
              className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary/10"
            >
              <BellRing size={44} color={COLORS.primary.default} />
            </Animated.View>
            <Text className="text-center text-3xl font-black uppercase tracking-tight text-primary">
              Nhắc nhở công việc
            </Text>
            <Text className="mt-1.5 text-base font-medium text-muted">
              Đến giờ thực hiện lịch hẹn bàn giao ca
            </Text>
          </View>

          {/* Body */}
          <View className="mb-8 rounded-3xl border border-outline-variant bg-surface-100 p-7">
            <View className="mb-4 flex-row items-start gap-3.5">
              <AlertTriangle size={28} color={COLORS.warning.default} className="mt-0.5" />
              <Text className="flex-1 text-[28px] font-black leading-9 text-surface-on">
                {activeNote.title}
              </Text>
            </View>

            {activeNote.content ? (
              <Text className="mb-5 pl-[40px] text-[18px] font-medium leading-7 text-surface-on-variant">
                {activeNote.content}
              </Text>
            ) : null}

            <View className="flex-row flex-wrap gap-x-6 gap-y-2 border-t border-[#e2e8f0] pl-[40px] pt-5">
              <View className="flex-row items-center">
                <Clock size={18} color={COLORS.muted} />
                <Text className="ml-2 text-sm font-bold text-muted">
                  Hạn hoàn thành: {formatDateTime(new Date(activeNote.targetTime))}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-sm font-bold text-muted">
                  Tạo bởi: {activeNote.createdByName}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer Actions */}
          <View className="flex-row gap-4">
            {/* Nhắc lại sau */}
            <Button
              label="Hoãn 5 phút"
              variant="secondary"
              leftIcon={Clock}
              iconSize={24}
              className="flex-1"
              onPress={handleSnooze}
            />

            {/* Hoàn thành */}
            <Button
              label="Đã làm xong"
              variant="primary"
              leftIcon={Check}
              iconSize={24}
              className="flex-1"
              onPress={handleMarkCompleted}
            />
          </View>

          {/* Bỏ qua nhanh */}
          <IconButton
            icon={X}
            variant="md"
            color={COLORS.surface.onVariant}
            onPress={handleClose}
            className="absolute right-6 top-6 bg-surface-100 active:bg-surface-200"
          />
        </View>
      </View>
    </Modal>
  )
}
