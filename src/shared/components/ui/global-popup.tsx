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
  const { visible, type, title, message, isConfirm, onConfirm, onCancel } = useAlertStore()
  const popupRef = useRef<PopupRef>(null)

  useEffect(() => {
    if (visible && isConfirm) {
      popupRef.current?.open()
    } else {
      popupRef.current?.close()
    }
  }, [visible, isConfirm])

  if (!isConfirm && visible) return null

  return (
    <Popup ref={popupRef} type={type} title={title} description={message} dismissible={false}>
      <View className="flex-row gap-3">
        <Button label="Hủy" onPress={onCancel} variant="outline" className="flex-1" />
        <Button label="Đồng ý" onPress={onConfirm} variant="primary" className="flex-1" />
      </View>
    </Popup>
  )
}
