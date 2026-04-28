import { create } from 'zustand'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

interface AlertState {
  visible: boolean
  type: AlertType
  title: string
  message: string
  isConfirm: boolean
  onConfirm?: () => void
  onCancel?: () => void
  /**
   * Hiển thị thông báo Global (Popup)
   */
  show: (params: { type?: AlertType; title: string; message: string }) => void
  /**
   * Hiển thị hộp thoại xác nhận (Confirm Dialog)
   */
  confirm: (params: {
    title: string
    message: string
    onConfirm: () => void
    onCancel?: () => void
  }) => void
  /**
   * Đóng thông báo
   */
  hide: () => void
}

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  type: 'info',
  title: '',
  message: '',
  isConfirm: false,
  onConfirm: undefined,
  onCancel: undefined,
  show: ({ type = 'info', title, message }) =>
    set({
      visible: true,
      type,
      title,
      message,
      isConfirm: false,
      onConfirm: undefined,
      onCancel: undefined,
    }),
  confirm: ({ title, message, onConfirm, onCancel }) =>
    set({
      visible: true,
      type: 'info',
      title,
      message,
      isConfirm: true,
      onConfirm: () => {
        onConfirm()
        set({ visible: false })
      },
      onCancel: () => {
        onCancel?.()
        set({ visible: false })
      },
    }),
  hide: () => set({ visible: false }),
}))

/**
 * Utility giống GetX: toast.error('lỗi'), toast.success('xong')
 * Có thể gọi ở bất cứ đâu (.ts, .tsx, api, flows...)
 */
export const toast = {
  error: (message: string, title = 'Lỗi hệ thống') =>
    useAlertStore.getState().show({ type: 'error', title, message }),
  success: (message: string, title = 'Thành công') =>
    useAlertStore.getState().show({ type: 'success', title, message }),
  warning: (message: string, title = 'Cảnh báo') =>
    useAlertStore.getState().show({ type: 'warning', title, message }),
  info: (message: string, title = 'Thông báo') =>
    useAlertStore.getState().show({ type: 'info', title, message }),
  confirm: (params: {
    title: string
    message: string
    onConfirm: () => void
    onCancel?: () => void
  }) => useAlertStore.getState().confirm(params),
}
