import { COLORS, SHADOW } from '@/shared/constants'
import { toast } from '@/shared/store/use-alert-store'
import { formatDateTime } from '@/shared/utils'
import { Bell, BellOff, Calendar, Check, Clock, Plus, Trash2, User, X } from 'lucide-react-native'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Button } from '@/shared/components/ui/button'
import { Chip } from '@/shared/components/ui/chip'
import { DatePicker } from '@/shared/components/ui/date-picker'
import { IconButton } from '@/shared/components/ui/icon-button'
import { ModalBase } from '@/shared/components/ui/modal-base'
import { HandoverNote, useNoteStore } from '../store/use-note-store'

interface ScrollWheelProps {
  items: string[]
  selectedValue: number
  onChange: (value: number) => void
  itemHeight?: number
}

const ScrollWheel = ({ items, selectedValue, onChange, itemHeight = 54 }: ScrollWheelProps) => {
  const scrollViewRef = React.useRef<ScrollView>(null)

  // Spacing empty elements at start and end
  const data = ['', ...items, '']

  const [localVal, setLocalVal] = useState(selectedValue)

  const initialIndex = items.indexOf(selectedValue.toString().padStart(2, '0'))
  const initialOffset = initialIndex !== -1 ? initialIndex * itemHeight : 0

  useEffect(() => {
    setLocalVal(selectedValue)
    const index = items.indexOf(selectedValue.toString().padStart(2, '0'))
    if (index !== -1 && scrollViewRef.current) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: index * itemHeight,
          animated: false,
        })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [selectedValue, itemHeight])

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y
    const index = Math.round(y / itemHeight)
    if (index >= 0 && index < items.length) {
      const val = parseInt(items[index], 10)
      if (val !== localVal) {
        setLocalVal(val)
      }
    }
  }

  const handleScrollEnd = (event: any) => {
    const y = event.nativeEvent.contentOffset.y
    const index = Math.round(y / itemHeight)
    if (index >= 0 && index < items.length) {
      const val = parseInt(items[index], 10)
      onChange(val)
    }
  }

  return (
    <View style={{ height: itemHeight * 3, width: 90, overflow: 'hidden' }}>
      {/* Target Indicator Highlight Box */}
      <View
        className="absolute left-0 right-0 rounded-2xl border-y border-primary/20 bg-primary/5"
        style={{
          top: itemHeight,
          height: itemHeight,
        }}
      />
      <ScrollView
        ref={scrollViewRef}
        contentOffset={{ x: 0, y: initialOffset }}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {data.map((item, index) => {
          const isSpacer = item === ''
          const itemVal = isSpacer ? null : parseInt(item, 10)
          const isActive = itemVal === localVal

          return (
            <View
              key={index}
              style={{
                height: itemHeight,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {!isSpacer && (
                <Text
                  className={
                    isActive ? 'text-3xl font-black text-primary' : 'text-xl font-medium text-muted'
                  }
                  style={{ opacity: isActive ? 1 : 0.3 }}
                >
                  {item}
                </Text>
              )}
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

export interface HandoverNotesModalRef {
  open: () => void
  close: () => void
}

type FilterType = 'all' | 'upcoming' | 'overdue' | 'completed'

// ==========================================
// 1. COLUMN LEFT: Scrollable Note List (Memoized)
// ==========================================
interface NoteListColumnProps {
  notes: HandoverNote[]
  activeFilter: FilterType
  setActiveFilter: (filter: FilterType) => void
  toggleComplete: (id: string) => void
  deleteNote: (id: string) => void
  selectedNoteId: string | null
  onSelectNoteId: (id: string | null) => void
}

const NoteListColumn = React.memo(
  ({
    notes,
    activeFilter,
    setActiveFilter,
    toggleComplete,
    deleteNote,
    selectedNoteId,
    onSelectNoteId,
  }: NoteListColumnProps) => {
    // Trích lọc danh sách ghi chú
    const filteredNotes = notes.filter((note) => {
      const isCompleted = note.isCompleted
      const isOverdue = !isCompleted && new Date(note.targetTime) < new Date()

      if (activeFilter === 'completed') return isCompleted
      if (activeFilter === 'overdue') return isOverdue
      if (activeFilter === 'upcoming') return !isCompleted && !isOverdue
      return true // 'all'
    })

    return (
      <View className="flex-[6] border-r border-[#e2e8f0] p-8">
        {/* Chip Filters Bar */}
        <View className="mb-6 flex-row gap-3">
          {[
            { type: 'all', label: 'Tất cả', count: notes.length },
            {
              type: 'upcoming',
              label: 'Sắp tới',
              count: notes.filter((n) => !n.isCompleted && new Date(n.targetTime) >= new Date())
                .length,
            },
            {
              type: 'overdue',
              label: 'Quá hạn',
              count: notes.filter((n) => !n.isCompleted && new Date(n.targetTime) < new Date())
                .length,
            },
            {
              type: 'completed',
              label: 'Đã xong',
              count: notes.filter((n) => n.isCompleted).length,
            },
          ].map((chip) => {
            const isActive = activeFilter === chip.type
            return (
              <Chip
                key={chip.type}
                label={chip.label}
                count={chip.count}
                active={isActive}
                onPress={() => setActiveFilter(chip.type as FilterType)}
                className="h-14 rounded-2xl px-6 py-4"
                textClassName="text-lg font-bold"
              />
            )
          })}
        </View>

        {/* Scrollable list */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {filteredNotes.length === 0 ? (
            <View className="flex-1 items-center justify-center py-24">
              <Text className="text-xl font-bold text-muted">
                Không có ghi chú nào trong mục này
              </Text>
            </View>
          ) : (
            <View className="gap-5">
              {filteredNotes.map((note) => {
                const isCompleted = note.isCompleted
                const isOverdue = !isCompleted && new Date(note.targetTime) < new Date()
                const isSelected = note.id === selectedNoteId

                // Custom Card style based on project color constants
                let cardBg: string = 'white'
                let cardBorder: string = '#e2e8f0'
                let badgeBg: string = '#f1f5f9'
                let badgeText: string = COLORS.muted
                let badgeLabel = 'Đang chờ'

                if (isCompleted) {
                  cardBg = COLORS.success.container
                  cardBorder = '#a7f3d0'
                  badgeBg = '#059669'
                  badgeText = 'white'
                  badgeLabel = 'Hoàn thành'
                } else if (isOverdue) {
                  cardBg = COLORS.error.container
                  cardBorder = '#fecaca'
                  badgeBg = COLORS.error.default
                  badgeText = 'white'
                  badgeLabel = 'Quá hạn'
                }

                return (
                  <TouchableOpacity
                    key={note.id}
                    activeOpacity={0.85}
                    onPress={() => onSelectNoteId(isSelected ? null : note.id)}
                    className="flex-row items-center justify-between rounded-3xl border p-6"
                    style={{
                      backgroundColor: cardBg,
                      borderColor: isSelected ? COLORS.primary.default : cardBorder,
                      borderWidth: isSelected ? 2.5 : 1,
                      ...SHADOW.sm,
                    }}
                  >
                    <View className="flex-1 pr-6">
                      <View className="mb-2 flex-row items-start gap-3">
                        <Text
                          className={`text-2xl font-black ${
                            isCompleted
                              ? 'text-success-onContainer line-through opacity-65'
                              : 'text-surface-on'
                          }`}
                        >
                          {note.title}
                        </Text>
                        <View
                          className="rounded-full px-3 py-1"
                          style={{ backgroundColor: badgeBg }}
                        >
                          <Text className="text-[11px] font-black" style={{ color: badgeText }}>
                            {badgeLabel}
                          </Text>
                        </View>
                      </View>

                      {note.content ? (
                        <Text
                          className={`mb-3 text-lg ${
                            isCompleted
                              ? 'text-success-onContainer opacity-60'
                              : 'text-surface-on-variant'
                          }`}
                          numberOfLines={2}
                        >
                          {note.content}
                        </Text>
                      ) : null}

                      {/* Note Metadata and Timeline */}
                      <View className="mt-1 flex-row flex-wrap items-center gap-x-5 gap-y-2">
                        <View className="flex-row items-center">
                          <Clock
                            size={16}
                            color={isCompleted ? COLORS.success.onContainer : COLORS.muted}
                          />
                          <Text
                            className="ml-2 text-sm font-semibold"
                            style={{
                              color: isCompleted ? COLORS.success.onContainer : COLORS.muted,
                            }}
                          >
                            Hạn: {formatDateTime(new Date(note.targetTime))}
                          </Text>
                        </View>

                        {note.isReminderActive ? (
                          <View className="flex-row items-center">
                            <Bell size={16} color={COLORS.primary.default} />
                            <Text className="ml-2 text-sm font-semibold text-primary">
                              Nhắc lúc: {formatDateTime(new Date(note.reminderTime))}
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center opacity-50">
                            <BellOff size={16} color={COLORS.muted} />
                            <Text
                              className="ml-2 text-sm font-semibold"
                              style={{ color: COLORS.muted }}
                            >
                              Tắt nhắc nhở
                            </Text>
                          </View>
                        )}

                        <View className="flex-row items-center">
                          <User
                            size={16}
                            color={isCompleted ? COLORS.success.onContainer : COLORS.muted}
                          />
                          <Text
                            className="ml-2 text-sm font-semibold"
                            style={{
                              color: isCompleted ? COLORS.success.onContainer : COLORS.muted,
                            }}
                          >
                            Tạo bởi: {note.createdByName} ({note.createdByCode})
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Card Actions */}
                    <View className="flex-row items-center gap-3">
                      <IconButton
                        icon={Check}
                        size={26}
                        color={isCompleted ? 'white' : '#cbd5e1'}
                        className={`h-14 w-14 rounded-2xl border active:scale-95 ${
                          isCompleted
                            ? 'border-success bg-success'
                            : 'border-outline-variant bg-white'
                        }`}
                        onPress={() => toggleComplete(note.id)}
                      />

                      <IconButton
                        icon={Trash2}
                        size={24}
                        color={COLORS.error.default}
                        className="h-14 w-14 rounded-2xl border border-[#fecaca] bg-white active:scale-95"
                        onPress={() => deleteNote(note.id)}
                      />
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </ScrollView>
      </View>
    )
  },
)

NoteListColumn.displayName = 'NoteListColumn'

// ==========================================
// 2. COLUMN RIGHT: Create/Edit Note Form (Memoized)
// ==========================================
interface CreateNoteFormColumnProps {
  selectedNote: HandoverNote | null
  onCancelEdit: () => void
  onCreateNote: (note: {
    title: string
    content: string
    targetTime: string
    reminderTime: string
    isReminderActive: boolean
  }) => void
  onUpdateNote: (note: {
    title: string
    content: string
    targetTime: string
    reminderTime: string
    isReminderActive: boolean
  }) => void
}

const CreateNoteFormColumn = React.memo(
  ({ selectedNote, onCancelEdit, onCreateNote, onUpdateNote }: CreateNoteFormColumnProps) => {
    // States cho Form
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [targetDate, setTargetDate] = useState<Date | null>(new Date())
    const [targetHour, setTargetHour] = useState(12)
    const [targetMin, setTargetMin] = useState(0)

    const [isReminderActive, setIsReminderActive] = useState(true)
    const [reminderOffsetMin, setReminderOffsetMin] = useState(0) // Mặc định nhắc đúng giờ

    // Synchronize edit values when selectedNote changes
    useEffect(() => {
      if (selectedNote) {
        setTitle(selectedNote.title)
        setContent(selectedNote.content)
        const tTime = new Date(selectedNote.targetTime)
        setTargetDate(tTime)
        setTargetHour(tTime.getHours())
        setTargetMin(tTime.getMinutes())
        setIsReminderActive(selectedNote.isReminderActive)

        const offsetMs =
          new Date(selectedNote.targetTime).getTime() -
          new Date(selectedNote.reminderTime).getTime()
        const offsetMin = Math.round(offsetMs / (60 * 1000))
        if ([0, 5, 10, 15].includes(offsetMin)) {
          setReminderOffsetMin(offsetMin)
        } else {
          setReminderOffsetMin(0)
        }
      } else {
        setTitle('')
        setContent('')
        setTargetDate(new Date())
        setTargetHour(12)
        setTargetMin(0)
        setIsReminderActive(true)
        setReminderOffsetMin(0)
      }
    }, [selectedNote])

    const handleCreate = () => {
      if (!title.trim()) {
        toast.warning('Vui lòng nhập tiêu đề ghi chú!', 'Lỗi nhập liệu')
        return
      }

      if (!targetDate) {
        toast.warning('Vui lòng chọn ngày thực hiện!', 'Lỗi nhập liệu')
        return
      }

      // Thiết lập thời gian hoàn thành (targetTime)
      const tTime = new Date(targetDate)
      tTime.setHours(targetHour, targetMin, 0, 0)

      // Thiết lập thời gian nhắc nhở (reminderTime)
      const rTime = new Date(tTime.getTime() - reminderOffsetMin * 60 * 1000)

      const noteData = {
        title: title.trim(),
        content: content.trim(),
        targetTime: tTime.toISOString(),
        reminderTime: rTime.toISOString(),
        isReminderActive,
      }

      if (selectedNote) {
        onUpdateNote(noteData)
      } else {
        onCreateNote(noteData)
      }
    }

    return (
      <View className="flex-[4] justify-between bg-white p-8">
        {/* Title Header */}
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Plus size={24} color={COLORS.primary.default} strokeWidth={3} className="mr-2" />
            <Text className="text-2xl font-black tracking-tight text-surface-on">
              {selectedNote ? 'Chi tiết ghi chú' : 'Thêm ghi chú mới'}
            </Text>
          </View>
          {selectedNote && (
            <Button
              label="Tạo mới"
              variant="secondary"
              onPress={onCancelEdit}
              className="h-12 rounded-2xl border-none px-6 py-2"
              textClassName="text-lg font-black"
            />
          )}
        </View>

        {/* Main Form Fields Container (flex-1) */}
        <View className="mb-5 flex-1 gap-5">
          {/* Tiêu đề */}
          <View>
            <Text className="mb-1.5 text-lg font-bold text-surface-on-variant">
              Tiêu đề công việc *
            </Text>
            <TextInput
              placeholder="Ví dụ: Kiểm hàng bia kho phụ, Bàn giao két..."
              placeholderTextColor={COLORS.outline.variant}
              className="h-16 rounded-xl border border-outline-variant bg-surface-100 px-5 text-lg font-medium text-surface-on"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Ngày thực hiện */}
          <View>
            <View className="mb-1.5 flex-row items-center gap-2">
              <Calendar size={18} color={COLORS.muted} className="mr-1.5" />
              <Text className="text-lg font-bold text-surface-on-variant">Ngày thực hiện</Text>
            </View>
            <DatePicker
              value={targetDate}
              onChange={(date) => setTargetDate(date)}
              placeholder="Chọn ngày thực hiện"
              minDate={new Date()}
            />
          </View>

          {/* Giờ thực hiện (Tablet custom scroll wheel picker) */}
          <View>
            <View className="mb-1.5 flex-row items-center gap-2">
              <Clock size={18} color={COLORS.muted} className="mr-1.5" />
              <Text className="text-lg font-bold text-surface-on-variant">Giờ thực hiện</Text>
            </View>

            <View className="flex-row items-center justify-center rounded-2xl border border-outline-variant bg-surface-100 px-6 py-1.5">
              {/* Hour Wheel */}
              <ScrollWheel
                items={Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))}
                selectedValue={targetHour}
                onChange={setTargetHour}
                itemHeight={44}
              />

              <Text className="px-8 text-3xl font-black text-muted">:</Text>

              {/* Minute Wheel */}
              <ScrollWheel
                items={Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))}
                selectedValue={targetMin}
                onChange={setTargetMin}
                itemHeight={44}
              />
            </View>
          </View>

          {/* Chi tiết nội dung - STRETCHES TO FILL ALL REMAINING SPACE! */}
          <View className="flex-1">
            <Text className="mb-1.5 text-lg font-bold text-surface-on-variant">
              Nội dung chi tiết
            </Text>
            <TextInput
              placeholder="Mô tả cụ thể những gì cần thực hiện..."
              placeholderTextColor={COLORS.outline.variant}
              multiline
              className="flex-1 rounded-xl border border-outline-variant bg-surface-100 p-5 text-lg font-medium text-surface-on"
              style={{ textAlignVertical: 'top' }}
              value={content}
              onChangeText={setContent}
            />
          </View>

          {/* Bật/Tắt nhắc nhở */}
          <View className="flex-row items-center justify-between border-b border-[#f1f5f9] py-1.5">
            <View>
              <View className="flex-row items-center gap-2">
                <Bell size={18} color={COLORS.primary.default} className="mr-1.5" />
                <Text className="text-lg font-bold text-surface-on" numberOfLines={1}>
                  Kích hoạt nhắc nhở
                </Text>
              </View>
              <Text className="mt-0.5 text-sm text-muted">Đổ chuông báo khi đến giờ hẹn</Text>
            </View>
            <Switch
              value={isReminderActive}
              onValueChange={setIsReminderActive}
              trackColor={{ false: '#cbd5e1', true: COLORS.primary.default }}
              thumbColor="white"
            />
          </View>

          {/* Tùy chọn nhắc nhở trước bao lâu */}
          {isReminderActive && (
            <View>
              <Text className="mb-2 text-lg font-bold text-surface-on-variant">
                Thời gian báo trước
              </Text>
              <View className="flex-row gap-3">
                {[
                  { val: 0, label: 'Đúng giờ' },
                  { val: 5, label: '5 phút' },
                  { val: 10, label: '10 phút' },
                  { val: 15, label: '15 phút' },
                ].map((opt) => {
                  const isSel = reminderOffsetMin === opt.val
                  return (
                    <Chip
                      key={opt.val}
                      label={opt.label}
                      active={isSel}
                      onPress={() => setReminderOffsetMin(opt.val)}
                      className="h-12 flex-1 items-center justify-center rounded-xl py-3"
                      textClassName="text-sm font-bold"
                    />
                  )
                })}
              </View>
            </View>
          )}
        </View>

        {/* Nút Tạo/Cập nhật */}
        <TouchableOpacity
          onPress={handleCreate}
          className="mt-3 h-16 items-center justify-center rounded-2xl active:scale-[0.98]"
          style={{
            backgroundColor: COLORS.primary.default,
            ...SHADOW.default,
          }}
        >
          <Text className="text-xl font-black text-white">
            {selectedNote ? 'Cập nhật Ghi chú' : 'Tạo Ghi chú'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  },
)

CreateNoteFormColumn.displayName = 'CreateNoteFormColumn'

// ==========================================
// 3. MAIN MODAL CONTAINER
// ==========================================
export const HandoverNotesModal = forwardRef<HandoverNotesModalRef, {}>((props, ref) => {
  const [visible, setVisible] = useState(false)
  const { notes, addNote, updateNote, toggleComplete, deleteNote, loadNotes } = useNoteStore()

  // State selected note ID
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  // State cho Bộ lọc
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

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
    (n) => !n.isCompleted && new Date(n.targetTime) < new Date(),
  ).length

  const handleCreateNote = React.useCallback(
    (newNote: {
      title: string
      content: string
      targetTime: string
      reminderTime: string
      isReminderActive: boolean
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

  return (
    <ModalBase
      visible={visible}
      onClose={handleClose}
      className="h-[90%] w-[92%] max-w-[1300px] rounded-3xl bg-[#f8fafc]"
    >
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
    </ModalBase>
  )
})

HandoverNotesModal.displayName = 'HandoverNotesModal'
