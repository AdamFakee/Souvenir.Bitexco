import { useSettingsStore } from '@/shared/store'
import React, { forwardRef, useImperativeHandle, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Checkbox } from './checkbox'
import { ModalBase } from './modal-base'

export interface SettingsModalRef {
  open: () => void
  close: () => void
}

export const SettingsModal = forwardRef<SettingsModalRef>((_, ref) => {
  const [visible, setVisible] = useState(false)
  const settings = useSettingsStore((state) => state.settings)
  const setSetting = useSettingsStore((state) => state.setSetting)

  useImperativeHandle(ref, () => ({
    open: () => setVisible(true),
    close: () => setVisible(false),
  }))

  if (!visible) return null

  return (
    <ModalBase
      visible={visible}
      onClose={() => setVisible(false)}
      className="w-[850px] rounded-[32px] bg-white"
    >
      <View className="p-10">
        <Text className="mb-8 text-5xl font-black text-surface-on">Cài đặt hệ thống</Text>

        <View className="gap-6">
          {/* Refund Checklist option */}
          <Pressable
            onPress={() => setSetting('refundRequireChecklist', !settings.refundRequireChecklist)}
            className="flex-row items-center gap-6 rounded-2xl border border-outline-variant bg-white p-7 active:bg-surface-50"
          >
            <Checkbox
              size="lg"
              checked={settings.refundRequireChecklist}
              onChange={(val) => setSetting('refundRequireChecklist', val)}
            />
            <View className="flex-1">
              <Text className="text-4xl font-bold text-surface-on">
                Yêu cầu checklist khi Trả hàng
              </Text>
              <Text className="mt-2 text-xl font-medium text-muted">
                Hiển thị hộp thoại checklist yêu cầu thu ngân xác nhận các bước nghiệp vụ trước khi
                hoàn tất trả hàng.
              </Text>
            </View>
          </Pressable>

          {/* Exchange Checklist option */}
          <Pressable
            onPress={() =>
              setSetting('exchangeRequireChecklist', !settings.exchangeRequireChecklist)
            }
            className="flex-row items-center gap-6 rounded-2xl border border-outline-variant bg-white p-7 active:bg-surface-50"
          >
            <Checkbox
              size="lg"
              checked={settings.exchangeRequireChecklist}
              onChange={(val) => setSetting('exchangeRequireChecklist', val)}
            />
            <View className="flex-1">
              <Text className="text-4xl font-bold text-surface-on">
                Yêu cầu checklist khi Đổi hàng
              </Text>
              <Text className="mt-2 text-xl font-medium text-muted">
                Hiển thị hộp thoại checklist yêu cầu thu ngân xác nhận các bước nghiệp vụ trước khi
                hoàn tất đổi hàng.
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </ModalBase>
  )
})

SettingsModal.displayName = 'SettingsModal'
