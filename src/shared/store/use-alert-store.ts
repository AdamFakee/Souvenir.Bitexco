import { create } from 'zustand'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: AlertType
  title: string
  message: string
}

interface AlertState {
  // Confirm Dialog State
  visible: boolean
  type: AlertType
  title: string
  message: string
  isConfirm: boolean
  onConfirm?: () => void
  onCancel?: () => void

  // Toasts State
  toasts: Toast[]

  /**
   * Hiển thị thông báo (Toast) - Tự động biến mất
   */
  show: (params: { type?: AlertType; title: string; message: string; duration?: number }) => void
  /**
   * Ẩn một Toast cụ thể
   */
  hideToast: (id: string) => void
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
   * Đóng hộp thoại xác nhận
   */
  hide: () => void
}

export const useAlertStore = create<AlertState>((set, get) => ({
  visible: false,
  type: 'info',
  title: '',
  message: '',
  isConfirm: false,
  onConfirm: undefined,
  onCancel: undefined,
  toasts: [],

  show: ({ type = 'info', title, message, duration = 4000 }) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = { id, type, title, message }

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))

    if (duration > 0) {
      setTimeout(() => {
        get().hideToast(id)
      }, duration)
    }
  },

  hideToast: (id: string) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

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
