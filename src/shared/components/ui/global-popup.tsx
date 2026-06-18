import { useAlertStore } from '@/shared/store'
import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { Button } from './button'
import { Popup, PopupRef } from './popup'

/**
 * Component hiển thị thông báo Global
 * Đặt tại Root của ứng dụng
 */
export const GlobalPopup = () => {
  const { visible, type, title, message, isConfirm, popupType, onConfirm, onCancel } =
    useAlertStore()
  const popupRef = useRef<PopupRef>(null)

  useEffect(() => {
    if (visible && isConfirm) {
      popupRef.current?.open()
    } else {
      popupRef.current?.close()
    }
  }, [visible, isConfirm])

  if (!isConfirm && visible) return null

  const showCancelButton = popupType === 'confirm'

  return (
    <Popup ref={popupRef} type={type} title={title} description={message} dismissible={false}>
      <View className="mt-2 flex-row gap-4">
        {showCancelButton && (
          <Button
            label="Hủy"
            onPress={onCancel}
            variant="outline"
            className="h-14 flex-1 rounded-xl px-4"
          />
        )}
        <Button
          label="Đồng ý"
          onPress={onConfirm}
          variant="primary"
          className="h-14 flex-1 rounded-xl px-4"
        />
      </View>
    </Popup>
  )
}
