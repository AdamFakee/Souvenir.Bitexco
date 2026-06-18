import { create } from 'zustand'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: AlertType
  title: string
  message: string
}

interface AlertState {
  // Confirm/Info Dialog State
  visible: boolean
  type: AlertType
  title: string
  message: string
  isConfirm: boolean
  popupType: 'confirm' | 'info' | null
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
   * Hiển thị hộp thoại xác nhận (Confirm Dialog - 2 nút)
   */
  confirm: (params: {
    title: string
    message: string
    onConfirm: () => void
    onCancel?: () => void
  }) => void
  /**
   * Hiển thị hộp thoại thông tin (Info Dialog - 1 nút)
   */
  infoPopup: (params: { title: string; message: string; onConfirm?: () => void }) => void
  /**
   * Đóng hộp thoại
   */
  hide: () => void
}

export const useAlertStore = create<AlertState>((set, get) => ({
  visible: false,
  type: 'info',
  title: '',
  message: '',
  isConfirm: false,
  popupType: null,
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
      popupType: 'confirm',
      onConfirm: () => {
        set({ visible: false, popupType: null })
        onConfirm()
      },
      onCancel: () => {
        set({ visible: false, popupType: null })
        onCancel?.()
      },
    }),

  infoPopup: ({ title, message, onConfirm }) =>
    set({
      visible: true,
      type: 'info',
      title,
      message,
      isConfirm: true,
      popupType: 'info',
      onConfirm: () => {
        set({ visible: false, popupType: null })
        onConfirm?.()
      },
      onCancel: undefined,
    }),

  hide: () => set({ visible: false, popupType: null }),
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
  infoPopup: (params: { title: string; message: string; onConfirm?: () => void }) =>
    useAlertStore.getState().infoPopup(params),
}
