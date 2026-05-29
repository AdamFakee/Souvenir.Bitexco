import { Chip } from '@/shared/components/ui/chip'
import { IconButton } from '@/shared/components/ui/icon-button'
import { COLORS, SHADOW } from '@/shared/constants'
import { formatDateTime } from '@/shared/utils'
import { Bell, BellOff, Check, Clock, Trash2, User } from 'lucide-react-native'
import React from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { HandoverNote } from '../store/use-note-store'

export type FilterType = 'all' | 'upcoming' | 'overdue' | 'completed'

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
