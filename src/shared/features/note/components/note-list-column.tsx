import { Chip } from '@/shared/components/ui/chip'
import { IconButton } from '@/shared/components/ui/icon-button'
import { COLORS, SHADOW } from '@/shared/constants'
import { formatDateTime } from '@/shared/utils'
import { Bell, BellOff, Check, Clock, Trash2, User, Star } from 'lucide-react-native'
import React from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { HandoverNote } from '../store/use-note-store'

export type FilterType = 'all' | 'important'

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
    const sortedNotes = React.useMemo(() => {
      return [...notes].sort((a, b) => {
        const sttA =
          a.stt !== undefined && a.stt !== null && a.stt !== '' ? Number(a.stt) : Infinity
        const sttB =
          b.stt !== undefined && b.stt !== null && b.stt !== '' ? Number(b.stt) : Infinity

        if (sttA !== Infinity || sttB !== Infinity) {
          if (sttA !== sttB) return sttA - sttB
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    }, [notes])

    const filteredNotes = sortedNotes.filter((note) => {
      if (activeFilter === 'important') return !!note.isImportant
      return true // 'all'
    })

    return (
      <View className="flex-[6] border-r border-[#e2e8f0] p-9">
        {/* Chip Filters Bar */}
        <View className="mb-7 flex-row gap-3.5">
          {[
            { type: 'all', label: 'Tất cả', count: notes.length },
            {
              type: 'important',
              label: 'Quan trọng',
              count: notes.filter((n) => n.isImportant).length,
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
              {filteredNotes.map((note) => {
                const isCompleted = note.isCompleted
                const isImportant = !!note.isImportant
                const isOverdue =
                  !isCompleted && !isImportant && new Date(note.targetTime) < new Date()
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
                    key={note.id}
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
                            isCompleted
                              ? 'text-success-onContainer line-through opacity-65'
                              : 'text-surface-on'
                          }`}
                        >
                          {note.title}
                        </Text>
                        <View
                          className="flex-row items-center gap-1 rounded-full px-3.5 py-1.5"
                          style={{ backgroundColor: badgeBg }}
                        >
                          {isImportant && <Star size={12} color="white" fill="white" />}
                          <Text className="text-[12px] font-black" style={{ color: badgeText }}>
                            {badgeLabel}
                          </Text>
                        </View>
                      </View>

                      {note.content ? (
                        <Text
                          className={`mb-3.5 text-[20px] ${
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
                      <View className="gap-x-5.5 mt-1.5 flex-row flex-wrap items-center gap-y-2.5">
                        <View className="flex-row items-center">
                          <Clock
                            size={20}
                            color={isCompleted ? COLORS.success.onContainer : COLORS.muted}
                          />
                          <Text
                            className="ml-2 text-[16px] font-semibold"
                            style={{
                              color: isCompleted ? COLORS.success.onContainer : COLORS.muted,
                            }}
                          >
                            Hạn: {formatDateTime(new Date(note.targetTime))}
                          </Text>
                        </View>

                        {note.isReminderActive ? (
                          <View className="flex-row items-center">
                            <Bell size={20} color={COLORS.primary.default} />
                            <Text className="ml-2 text-[16px] font-semibold text-primary">
                              Nhắc lúc: {formatDateTime(new Date(note.reminderTime))}
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center opacity-50">
                            <BellOff size={20} color={COLORS.muted} />
                            <Text
                              className="ml-2 text-[16px] font-semibold"
                              style={{ color: COLORS.muted }}
                            >
                              Tắt nhắc nhở
                            </Text>
                          </View>
                        )}

                        <View className="flex-row items-center">
                          <User
                            size={20}
                            color={isCompleted ? COLORS.success.onContainer : COLORS.muted}
                          />
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
                          isCompleted
                            ? 'border-success bg-success'
                            : 'border-outline-variant bg-white'
                        }`}
                        onPress={() => toggleComplete(note.id)}
                      />

                      <IconButton
                        icon={Trash2}
                        size={26}
                        color={COLORS.error.default}
                        className="h-[62px] w-[62px] rounded-2xl border border-[#fecaca] bg-white active:scale-95"
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
