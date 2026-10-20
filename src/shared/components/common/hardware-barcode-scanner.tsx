import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { AppState, Keyboard, TextInput, TextInputProps } from 'react-native'

export interface HardwareBarcodeScannerProps extends Partial<TextInputProps> {
  onScan: (codes: string[]) => void
  onFocusChange?: (isFocused: boolean) => void
  ref?: React.Ref<HardwareBarcodeScannerRef>
}

export interface HardwareBarcodeScannerRef {
  focus: () => void
  clear: () => void
}

/**
 * Component ẩn dùng để hứng dữ liệu từ máy quét mã vạch
 */
export const HardwareBarcodeScanner = ({
  onScan,
  onFocusChange,
  ref,
  onBlur: propsOnBlur,
  onFocus: propsOnFocus,
  style,
  ...props
}: HardwareBarcodeScannerProps) => {
  const inputRef = useRef<TextInput>(null)
  const rawBufferRef = useRef('')
  const readCursorRef = useRef(0)
  const refocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isKeyboardVisibleRef = useRef(false)

  // Công khai các hàm điều khiển cho component cha
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      inputRef.current?.clear()
      rawBufferRef.current = ''
      readCursorRef.current = 0
    },
  }))

  // QUẢN LÝ FOCUS HỆ THỐNG & THEO DÕI BÀN PHÍM
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 400)

    const keyboardShowSub = Keyboard.addListener('keyboardDidShow', () => {
      isKeyboardVisibleRef.current = true
    })

    const keyboardHideSub = Keyboard.addListener('keyboardDidHide', () => {
      isKeyboardVisibleRef.current = false
      // Khi đóng bàn phím mềm ở bất kỳ màn hình nào, trả focus ngay về cho scanner
      inputRef.current?.focus()
    })

    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        inputRef.current?.focus()
      }
    })

    return () => {
      clearTimeout(timer)
      if (refocusTimerRef.current) clearTimeout(refocusTimerRef.current)
      keyboardShowSub.remove()
      keyboardHideSub.remove()
      appStateSub.remove()
    }
  }, [])

  const handleBarcodeScanned = useCallback(() => {
    const raw = rawBufferRef.current
    const chunk = raw.slice(readCursorRef.current)
    readCursorRef.current = raw.length

    if (!chunk) return

    const codes = chunk
      .split(/[\r\n\t]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    if (codes.length > 0) {
      onScan(codes)
    }

    inputRef.current?.clear()
  }, [onScan])

  const handleBlur = useCallback(
    (e: any) => {
      onFocusChange?.(false)
      propsOnBlur?.(e)

      // Auto Re-focus: Tự động lấy lại focus sau khi thu ngân hoàn tất thao tác touch trên màn hình
      if (refocusTimerRef.current) {
        clearTimeout(refocusTimerRef.current)
      }
      refocusTimerRef.current = setTimeout(() => {
        // Chỉ re-focus nếu bàn phím mềm không hiển thị (thu ngân không chủ động nhập ô text khác)
        if (!isKeyboardVisibleRef.current) {
          inputRef.current?.focus()
        }
      }, 350)
    },
    [onFocusChange, propsOnBlur],
  )

  const handleFocus = useCallback(
    (e: any) => {
      onFocusChange?.(true)
      propsOnFocus?.(e)
    },
    [onFocusChange, propsOnFocus],
  )

  return (
    <TextInput
      ref={inputRef}
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1,
          height: 1,
          opacity: 0.01,
        },
        style,
      ]}
      pointerEvents="none"
      showSoftInputOnFocus={false}
      autoFocus={true}
      caretHidden={true}
      contextMenuHidden={true}
      blurOnSubmit={false} // Giữ focus liên tục sau khi quét Enter
      onChangeText={(text) => {
        if (text.length < readCursorRef.current) {
          readCursorRef.current = 0
        }
        rawBufferRef.current = text
      }}
      onSubmitEditing={handleBarcodeScanned}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  )
}
