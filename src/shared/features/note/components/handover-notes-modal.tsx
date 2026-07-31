import { ModalBase } from '@/shared/components/ui/modal-base'
import { COLORS } from '@/shared/constants'
import { toast } from '@/shared/store/use-alert-store'
import { X } from 'lucide-react-native'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { ActivityIndicator, TouchableOpacity, View, Text } from 'react-native'
import { useNoteStore } from '../store/use-note-store'
import { CreateNoteFormColumn } from './create-note-form-column'
import { FilterType, NoteListColumn } from './note-list-column'

export interface HandoverNotesModalRef {
  open: () => void
  close: () => void
}

export const HandoverNotesModal = forwardRef<HandoverNotesModalRef, {}>((props, ref) => {
  const [visible, setVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const { notes, addNote, updateNote, toggleComplete, deleteNote, loadNotes } = useNoteStore()

  // State selected note ID
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  // State cho Bộ lọc
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setShouldRender(true)
      }, 150)
      return () => clearTimeout(timer)
    } else {
      setShouldRender(false)
    }
  }, [visible])

  // Tìm ghi chú đang được chọn để hiển thị chi tiết/sửa
  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null

  // Cấu hình Ref interface
  useImperativeHandle(ref, () => ({
    open: () => setVisible(true),
    close: () => setVisible(false),
  }))

  useEffect(() => {
    if (visible) {
      loadNotes()
    }
  }, [visible])

  // Clear selection khi đóng modal
  useEffect(() => {
    if (!visible) {
      setSelectedNoteId(null)
    }
  }, [visible])

  // Hàm đếm số ghi chú chưa hoàn thành để làm Badge
  const pendingCount = notes.filter((n) => !n.isCompleted).length
  const overdueCount = notes.filter(
    (n) =>
      !n.isCompleted && !n.isImportant && n.isReminderActive && new Date(n.targetTime) < new Date(),
  ).length

  const handleCreateNote = React.useCallback(
    (newNote: {
      title: string
      content: string
      targetTime: string
      reminderTime: string
      isReminderActive: boolean
      isImportant?: boolean
      stt?: number | null | string
    }) => {
      addNote(newNote)
      toast.success('Đã tạo ghi chú thành công!')
    },
    [addNote],
  )

  const handleUpdateNote = React.useCallback(
    (newNote: {
      title: string
      content: string
      targetTime: string
      reminderTime: string
      isReminderActive: boolean
      isImportant?: boolean
      stt?: number | null | string
    }) => {
      if (selectedNoteId) {
        updateNote(selectedNoteId, newNote)
        setSelectedNoteId(null) // Quay lại chế độ tạo mới
        toast.success('Đã cập nhật ghi chú thành công!')
      }
    },
    [selectedNoteId, updateNote],
  )

  const handleCancelEdit = React.useCallback(() => {
    setSelectedNoteId(null)
  }, [])

  const handleClose = () => {
    setVisible(false)
  }

  if (!visible) return null

  return (
    <ModalBase
      visible={visible}
      onClose={handleClose}
      className="h-[90%] w-[92%] max-w-[1300px] rounded-3xl bg-[#f8fafc]"
    >
      {shouldRender ? (
        <>
          {/* Modal Header */}
          <View className="flex-row items-center justify-between border-b border-[#e2e8f0] bg-white px-8 py-6">
            <View className="flex-row items-center">
              <Text className="text-3xl font-black tracking-tight text-surface-on">Note</Text>
              {pendingCount > 0 && (
                <View className="ml-4 rounded-full bg-primary px-4 py-1.5">
                  <Text className="text-sm font-black text-white">{pendingCount} việc cần làm</Text>
                </View>
              )}
              {overdueCount > 0 && (
                <View className="ml-3 rounded-full bg-error px-4 py-1.5">
                  <Text className="text-sm font-black text-white">{overdueCount} quá hạn</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={handleClose}
              className="h-12 w-12 items-center justify-center rounded-full bg-surface-200 active:bg-surface-300"
            >
              <X size={24} color={COLORS.surface.onVariant} />
            </TouchableOpacity>
          </View>

          {/* Modal Body - 2 Columns */}
          <View className="flex-1 flex-row">
            {/* COLUMN LEFT (60%): Danh sách ghi chú */}
            <NoteListColumn
              notes={notes}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              toggleComplete={toggleComplete}
              deleteNote={deleteNote}
              selectedNoteId={selectedNoteId}
              onSelectNoteId={setSelectedNoteId}
            />

            {/* COLUMN RIGHT (40%): Form tạo/sửa ghi chú nhanh */}
            <CreateNoteFormColumn
              selectedNote={selectedNote}
              onCancelEdit={handleCancelEdit}
              onCreateNote={handleCreateNote}
              onUpdateNote={handleUpdateNote}
            />
          </View>
        </>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary.default} />
        </View>
      )}
    </ModalBase>
  )
})

HandoverNotesModal.displayName = 'HandoverNotesModal'
