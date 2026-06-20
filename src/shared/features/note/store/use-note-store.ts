import { storage } from '@/shared/lib/storage'
import { create } from 'zustand'
import { useAppStore } from '@/shared/features/app/store/use-app-store'
import { AppState } from 'react-native'

export interface HandoverNote {
  id: string
  title: string
  content: string
  targetTime: string // ISO string
  reminderTime: string // ISO string
  isCompleted: boolean
  isReminderActive: boolean
  createdAt: string // ISO string
  createdById: string
  createdByName: string
  createdByCode: string
}

interface NoteState {
  notes: HandoverNote[]
  activeReminderId: string | null // Ghi chú đang hiển thị cảnh báo nhắc nhở

  // Actions
  loadNotes: () => void
  addNote: (params: {
    title: string
    content: string
    targetTime: string
    reminderTime: string
    isReminderActive: boolean
  }) => void
  updateNote: (
    id: string,
    params: {
      title: string
      content: string
      targetTime: string
      reminderTime: string
      isReminderActive: boolean
    },
  ) => void
  toggleComplete: (id: string) => void
  deleteNote: (id: string) => void
  setActiveReminderId: (id: string | null) => void
  snoozeReminder: (id: string, minutes?: number) => void
  scheduleNextReminder: () => void
}

const STORAGE_KEY = 'local-handover-notes'
let reminderTimeout: ReturnType<typeof setTimeout> | null = null

// Helper lưu danh sách notes xuống MMKV
const saveNotesToStorage = (notes: HandoverNote[]) => {
  try {
    storage.set(STORAGE_KEY, JSON.stringify(notes))
  } catch {}
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  activeReminderId: null,

  loadNotes: () => {
    try {
      const raw = storage.getString(STORAGE_KEY)
      const notes = raw ? (JSON.parse(raw) as HandoverNote[]) : []
      set({ notes })
      get().scheduleNextReminder()
    } catch {
      set({ notes: [] })
    }
  },

  addNote: ({ title, content, targetTime, reminderTime, isReminderActive }) => {
    // Lấy thông tin nhân viên hiện tại đang đăng nhập từ appMachine context làm snapshot
    const employee = useAppStore.getState().appService?.getSnapshot()?.context?.employee

    const newNote: HandoverNote = {
      id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      title: title.trim(),
      content: content.trim(),
      targetTime,
      reminderTime,
      isCompleted: false,
      isReminderActive,
      createdAt: new Date().toISOString(),
      createdById: employee?.id || 'unknown',
      createdByName: employee?.displayName || 'Nhân viên hệ thống',
      createdByCode: employee?.employeeCode || 'SYSTEM',
    }

    set((state) => {
      const updated = [newNote, ...state.notes]
      saveNotesToStorage(updated)
      return { notes: updated }
    })

    // Lập lịch lại nhắc nhở vì có ghi chú mới
    get().scheduleNextReminder()
  },

  updateNote: (id, { title, content, targetTime, reminderTime, isReminderActive }) => {
    set((state) => {
      const updated = state.notes.map((n) =>
        n.id === id
          ? {
              ...n,
              title: title.trim(),
              content: content.trim(),
              targetTime,
              reminderTime,
              isReminderActive,
            }
          : n,
      )
      saveNotesToStorage(updated)
      return { notes: updated }
    })

    get().scheduleNextReminder()
  },

  toggleComplete: (id) => {
    set((state) => {
      const updated = state.notes.map((n) =>
        n.id === id ? { ...n, isCompleted: !n.isCompleted } : n,
      )
      saveNotesToStorage(updated)
      return { notes: updated }
    })

    // Lập lịch lại nhắc nhở
    get().scheduleNextReminder()
  },

  deleteNote: (id) => {
    set((state) => {
      const updated = state.notes.filter((n) => n.id !== id)
      saveNotesToStorage(updated)
      return { notes: updated }
    })

    // Lập lịch lại nhắc nhở
    get().scheduleNextReminder()
  },

  setActiveReminderId: (id) => {
    set({ activeReminderId: id })
  },

  snoozeReminder: (id, minutes = 5) => {
    // Snooze: Tắt alert hiện tại, lùi giờ nhắc thêm X phút và kích hoạt lại nhắc nhở
    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000).toISOString()

    set((state) => {
      const updated = state.notes.map((n) =>
        n.id === id ? { ...n, reminderTime: snoozeTime, isReminderActive: true } : n,
      )
      saveNotesToStorage(updated)
      return { notes: updated, activeReminderId: null }
    })

    get().scheduleNextReminder()
  },

  scheduleNextReminder: () => {
    // 1. Xóa timer cũ nếu đang chạy
    if (reminderTimeout) {
      clearTimeout(reminderTimeout)
      reminderTimeout = null
    }

    // 2. Tìm các ghi chú chưa xong, đã bật nhắc nhở và có lịch nhắc trong tương lai
    const upcomingNotes = get()
      .notes.filter((n) => !n.isCompleted && n.isReminderActive)
      .map((n) => ({
        ...n,
        timeMs: new Date(n.reminderTime).getTime(),
      }))
      .filter((n) => n.timeMs > Date.now())
      .sort((a, b) => a.timeMs - b.timeMs) // Sắp xếp tăng dần để lấy cái gần nhất

    if (upcomingNotes.length === 0) return

    // 3. Lấy ghi chú gần nhất
    const nextNote = upcomingNotes[0]
    const delay = nextNote.timeMs - Date.now()

    // 4. Đặt setTimeout để báo thức
    reminderTimeout = setTimeout(() => {
      // Chỉ kích hoạt cảnh báo nếu ứng dụng đang ở trạng thái ACTIVE
      if (AppState.currentState === 'active') {
        set({ activeReminderId: nextNote.id })
      } else {
        // Nếu app ngầm, lập lịch lại để kiểm tra sau khi app active lại
        get().scheduleNextReminder()
      }
    }, delay)
  },
}))

// Theo dõi AppState chuyển sang Active để tự động kiểm tra/lập lịch lại
AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState === 'active') {
    useNoteStore.getState().scheduleNextReminder()
  }
})
