import { Button } from '@/shared/components/ui/button'
import { Chip } from '@/shared/components/ui/chip'
import { DatePicker } from '@/shared/components/ui/date-picker'
import { ControlledInput } from '@/shared/components/ui/form'
import { COLORS, SHADOW } from '@/shared/constants'
import { toast } from '@/shared/store/use-alert-store'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Bell, Calendar, Clock, Plus } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Switch, Text, TouchableOpacity, View } from 'react-native'
import { HandoverNote } from '../store/use-note-store'
import { NoteFormSchema, NoteFormValues } from '../validation'
import { ScrollWheel } from './scroll-wheel'

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

export const CreateNoteFormColumn = React.memo(
  ({ selectedNote, onCancelEdit, onCreateNote, onUpdateNote }: CreateNoteFormColumnProps) => {
    // react-hook-form với valibot resolver
    const { control, handleSubmit, reset } = useForm<NoteFormValues>({
      resolver: valibotResolver(NoteFormSchema),
      defaultValues: { title: '', content: '' },
    })

    // Local state cho date/time/reminder (không phải text input)
    const [targetDate, setTargetDate] = useState<Date | null>(new Date())
    const [targetHour, setTargetHour] = useState(12)
    const [targetMin, setTargetMin] = useState(0)
    const [isReminderActive, setIsReminderActive] = useState(true)
    const [reminderOffsetMin, setReminderOffsetMin] = useState(0)

    // Sync form + local state khi selectedNote thay đổi hoặc khi khởi tạo
    useEffect(() => {
      if (selectedNote) {
        reset({ title: selectedNote.title, content: selectedNote.content })
        const tTime = new Date(selectedNote.targetTime)
        setTargetDate(tTime)
        setTargetHour(tTime.getHours())
        const roundedMin = Math.round(tTime.getMinutes() / 5) * 5
        setTargetMin(roundedMin >= 60 ? 55 : roundedMin)
        setIsReminderActive(selectedNote.isReminderActive)
        const offsetMs =
          new Date(selectedNote.targetTime).getTime() -
          new Date(selectedNote.reminderTime).getTime()
        const offsetMin = Math.round(offsetMs / (60 * 1000))
        setReminderOffsetMin([0, 5, 10, 15].includes(offsetMin) ? offsetMin : 0)
      } else {
        reset({ title: '', content: '' })
        const now = new Date()
        setTargetDate(now)
        setTargetHour(now.getHours())
        const roundedMin = Math.round(now.getMinutes() / 5) * 5
        setTargetMin(roundedMin >= 60 ? 55 : roundedMin)
        setIsReminderActive(true)
        setReminderOffsetMin(0)
      }
    }, [selectedNote, reset])

    const onSubmit = (values: NoteFormValues) => {
      if (!targetDate) {
        toast.warning('Vui lòng chọn ngày thực hiện!', 'Lỗi nhập liệu')
        return
      }
      const tTime = new Date(targetDate)
      tTime.setHours(targetHour, targetMin, 0, 0)
      const rTime = new Date(tTime.getTime() - reminderOffsetMin * 60 * 1000)
      const noteData = {
        title: values.title.trim(),
        content: values.content.trim(),
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
          <ControlledInput
            control={control}
            name="title"
            label="Tiêu đề công việc"
            required
            placeholder="Ví dụ: Kiểm hàng bia kho phụ, Bàn giao két..."
            returnKeyType="next"
            autoCorrect={false}
          />

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

              {/* Minute Wheel (Multiples of 5: 00, 05, 10, ... 55) */}
              <ScrollWheel
                items={Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'))}
                selectedValue={targetMin}
                onChange={setTargetMin}
                itemHeight={44}
              />
            </View>
          </View>

          {/* Nội dung chi tiết */}
          <ControlledInput
            control={control}
            name="content"
            label="Nội dung chi tiết"
            placeholder="Mô tả cụ thể những gì cần thực hiện..."
            multiline
            containerClassName="flex-1 mb-0"
            className="flex-1 rounded-xl border p-4"
            style={{ textAlignVertical: 'top', minHeight: 180 }}
          />

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
          onPress={handleSubmit(onSubmit)}
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
