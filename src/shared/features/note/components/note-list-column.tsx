import { Chip } from '@/shared/components/ui/chip'
import { IconButton } from '@/shared/components/ui/icon-button'
import { COLORS, SHADOW } from '@/shared/constants'
import { toast } from '@/shared/store/use-alert-store'
import { formatDateTime } from '@/shared/utils'
import { Bell, Check, Clock, Star, Trash2, User } from 'lucide-react-native'
import React from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { HandoverNote } from '../store/use-note-store'

export type FilterType = 'all' | 'important'

interface NoteItemProps {
  note: HandoverNote
  isSelected: boolean
  onSelectNoteId: (id: string | null) => void
  toggleComplete: (id: string) => void
  deleteNote: (id: string) => void
}

const NoteItem = React.memo(
  ({ note, isSelected, onSelectNoteId, toggleComplete, deleteNote }: NoteItemProps) => {
    const isCompleted = note.isCompleted
    const isImportant = !!note.isImportant
    const isOverdue =
      !isCompleted &&
      !isImportant &&
      note.isReminderActive &&
      new Date(note.targetTime) < new Date()

    // Custom Card style based on project color constants
    let cardBg: string = 'white'
    let cardBorder: string = '#e2e8f0'
    let badgeBg: string = '#f1f5f9'
    let badgeText: string = COLORS.muted
    let badgeLabel = null

    if (isCompleted) {
      cardBg = COLORS.success.container
      cardBorder = '#a7f3d0'
      badgeBg = '#059669'
      badgeText = 'white'
      badgeLabel = 'Hoàn thành'
    } else if (isImportant) {
      cardBg = '#fffbeb' // Amber-50
      cardBorder = '#fde68a' // Amber-200
      badgeBg = '#d97706' // Amber-600
      badgeText = 'white'
      badgeLabel = 'Quan trọng'
    } else if (isOverdue) {
      cardBg = COLORS.error.container
      cardBorder = '#fecaca'
      badgeBg = COLORS.error.default
      badgeText = 'white'
      badgeLabel = 'Quá hạn'
    }

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onSelectNoteId(isSelected ? null : note.id)}
        className="flex-row items-center justify-between rounded-3xl border p-7"
        style={{
          backgroundColor: cardBg,
          borderColor: isSelected ? COLORS.primary.default : cardBorder,
          borderWidth: isSelected ? 2.5 : 1,
          ...SHADOW.sm,
        }}
      >
        <View className="flex-1 pr-7">
          <View className="mb-2.5 flex-row items-center gap-3.5">
            {note.stt !== undefined && note.stt !== null && note.stt !== '' && (
              <View className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-1">
                <Text className="text-[16px] font-black text-primary">#{note.stt}</Text>
              </View>
            )}
            <Text
              className={`text-[26px] font-black ${
                isCompleted ? 'text-success-onContainer line-through opacity-65' : 'text-surface-on'
              }`}
            >
              {note.title}
            </Text>
            {badgeLabel && (
              <View
                className="flex-row items-center gap-1 rounded-full px-3.5 py-1.5"
                style={{ backgroundColor: badgeBg }}
              >
                {isImportant && <Star size={12} color="white" fill="white" />}
                <Text className="text-[12px] font-black" style={{ color: badgeText }}>
                  {badgeLabel}
                </Text>
              </View>
            )}
          </View>

          {note.content ? (
            <Text
              className={`mb-3.5 text-[20px] ${
                isCompleted ? 'text-success-onContainer opacity-60' : 'text-surface-on-variant'
              }`}
              numberOfLines={2}
            >
              {note.content}
            </Text>
          ) : null}

          {/* Note Metadata and Timeline */}
          <View className="mt-3 gap-2">
            {/* Line 1: Target Time & optional active reminder icon */}
            <View className="flex-row items-center">
              <Clock size={20} color={isCompleted ? COLORS.success.onContainer : COLORS.muted} />
              <Text
                className="ml-2 text-[16px] font-semibold"
                style={{
                  color: isCompleted ? COLORS.success.onContainer : COLORS.muted,
                }}
              >
                Hạn: {formatDateTime(new Date(note.targetTime))}
              </Text>
              {note.isReminderActive && (
                <View className="ml-3 rounded-lg bg-primary/10 p-1.5">
                  <Bell size={18} color={COLORS.primary.default} fill={COLORS.primary.default} />
                </View>
              )}
            </View>

            {/* Line 2: Creator Info */}
            <View className="flex-row items-center">
              <User size={20} color={isCompleted ? COLORS.success.onContainer : COLORS.muted} />
              <Text
                className="ml-2 text-[16px] font-semibold"
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
        <View className="flex-row items-center gap-3.5">
          <IconButton
            icon={Check}
            size={29}
            color={isCompleted ? 'white' : '#cbd5e1'}
            className={`h-[62px] w-[62px] rounded-2xl border active:scale-95 ${
              isCompleted ? 'border-success bg-success' : 'border-outline-variant bg-white'
            }`}
            onPress={() => toggleComplete(note.id)}
          />

          <IconButton
            icon={Trash2}
            size={26}
            color={COLORS.error.default}
            className="h-[62px] w-[62px] rounded-2xl border border-[#fecaca] bg-white active:scale-95"
            onPress={() => {
              toast.confirm({
                title: 'Xác nhận xóa ghi chú',
                message: `Bạn có chắc chắn muốn xóa ghi chú này không?`,
                onConfirm: () => {
                  deleteNote(note.id)
                  toast.success('Đã xóa ghi chú thành công!')
                },
              })
            }}
          />
        </View>
      </TouchableOpacity>
    )
  },
)
NoteItem.displayName = 'NoteItem'

interface NoteListColumnProps {
  notes: HandoverNote[]
  activeFilter: FilterType
  setActiveFilter: (filter: FilterType) => void
  toggleComplete: (id: string) => void
  deleteNote: (id: string) => void
  selectedNoteId: string | null
  onSelectNoteId: (id: string | null) => void
}

export const NoteListColumn = React.memo(
  ({
    notes,
    activeFilter,
    setActiveFilter,
    toggleComplete,
    deleteNote,
    selectedNoteId,
    onSelectNoteId,
  }: NoteListColumnProps) => {
    // Sắp xếp và trích lọc danh sách ghi chú
    const { filteredNotes, importantCount } = React.useMemo(() => {
      const sorted = [...notes].sort((a, b) => {
        // 1. Ghi chú quan trọng (isImportant) lên đầu tiên
        const impA = a.isImportant ? 1 : 0
        const impB = b.isImportant ? 1 : 0
        if (impA !== impB) return impB - impA

        // 2. Tiếp theo theo STT
        const sttA =
          a.stt !== undefined && a.stt !== null && a.stt !== '' ? Number(a.stt) : Infinity
        const sttB =
          b.stt !== undefined && b.stt !== null && b.stt !== '' ? Number(b.stt) : Infinity

        if (sttA !== Infinity || sttB !== Infinity) {
          if (sttA !== sttB) return sttA - sttB
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      const filtered = sorted.filter((note) => {
        if (activeFilter === 'important') return !!note.isImportant
        return true // 'all'
      })

      const impCount = notes.filter((n) => n.isImportant).length

      return {
        filteredNotes: filtered,
        importantCount: impCount,
      }
    }, [notes, activeFilter])

    return (
      <View className="flex-[6] border-r border-[#e2e8f0] p-9">
        {/* Chip Filters Bar */}
        <View className="mb-7 flex-row gap-3.5">
          {[
            { type: 'all', label: 'Tất cả', count: notes.length },
            {
              type: 'important',
              label: 'Quan trọng',
              count: importantCount,
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
                className="h-[62px] rounded-2xl px-7 py-4"
                textClassName="text-[20px] font-bold"
              />
            )
          })}
        </View>

        {/* Scrollable list */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {filteredNotes.length === 0 ? (
            <View className="py-26 flex-1 items-center justify-center">
              <Text className="text-[22px] font-bold text-muted">
                Không có ghi chú nào trong mục này
              </Text>
            </View>
          ) : (
            <View className="gap-6">
              {filteredNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  isSelected={note.id === selectedNoteId}
                  onSelectNoteId={onSelectNoteId}
                  toggleComplete={toggleComplete}
                  deleteNote={deleteNote}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    )
  },
)

NoteListColumn.displayName = 'NoteListColumn'
