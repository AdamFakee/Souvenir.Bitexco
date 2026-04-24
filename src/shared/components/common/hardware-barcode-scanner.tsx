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
  ...props
}: HardwareBarcodeScannerProps) => {
  const inputRef = useRef<TextInput>(null)
  const rawBufferRef = useRef('')
  const readCursorRef = useRef(0)

  // Công khai các hàm điều khiển cho component cha
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      inputRef.current?.clear()
      rawBufferRef.current = ''
      readCursorRef.current = 0
    },
  }))

  // QUẢN LÝ FOCUS HỆ THỐNG
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 500)

    const keyboardSub = Keyboard.addListener('keyboardDidHide', () => {
      inputRef.current?.focus()
    })

    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        inputRef.current?.focus()
      }
    })

    return () => {
      clearTimeout(timer)
      keyboardSub.remove()
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

  return (
    <TextInput
      ref={inputRef}
      className="absolute -left-[1000px] top-0 h-[1px] w-[1px] opacity-0"
      onChangeText={(text) => {
        if (text.length < readCursorRef.current) {
          readCursorRef.current = 0
        }
        rawBufferRef.current = text
      }}
      onSubmitEditing={handleBarcodeScanned}
      autoFocus={true}
      showSoftInputOnFocus={false}
      onFocus={() => onFocusChange?.(true)}
      onBlur={() => onFocusChange?.(false)}
      blurOnSubmit={false} // QUAN TRỌNG: Giữ focus liên tục để tránh Metro bắt phím tắt
      {...props}
    />
  )
}
