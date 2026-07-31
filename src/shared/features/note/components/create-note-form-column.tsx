import { Button } from '@/shared/components/ui/button'
import { DatePicker } from '@/shared/components/ui/date-picker'
import { ControlledInput } from '@/shared/components/ui/form'
import { COLORS, SHADOW } from '@/shared/constants'
import { toast } from '@/shared/store/use-alert-store'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Bell, Calendar, Plus, Star } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
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
    isImportant?: boolean
    stt?: number | null | string
  }) => void
  onUpdateNote: (note: {
    title: string
    content: string
    targetTime: string
    reminderTime: string
    isReminderActive: boolean
    isImportant?: boolean
    stt?: number | null | string
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
    const [isReminderActive, setIsReminderActive] = useState(false)
    const [isImportant, setIsImportant] = useState(false)
    const [stt, setStt] = useState<string>('')

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
        setIsImportant(!!selectedNote.isImportant)
        setStt(
          selectedNote.stt !== undefined && selectedNote.stt !== null
            ? selectedNote.stt.toString()
            : '',
        )
      } else {
        reset({ title: '', content: '' })
        const now = new Date()
        setTargetDate(now)
        setTargetHour(now.getHours())
        const roundedMin = Math.round(now.getMinutes() / 5) * 5
        setTargetMin(roundedMin >= 60 ? 55 : roundedMin)
        setIsReminderActive(false)
        setIsImportant(false)
        setStt('')
      }
    }, [selectedNote, reset])

    const onSubmit = (values: NoteFormValues) => {
      if (!targetDate) {
        toast.warning('Vui lòng chọn ngày thực hiện!', 'Lỗi nhập liệu')
        return
      }
      const tTime = new Date(targetDate)
      tTime.setHours(targetHour, targetMin, 0, 0)
      const parsedStt = stt.trim() === '' ? null : parseInt(stt, 10)
      const noteData = {
        title: values.title.trim(),
        content: values.content.trim(),
        targetTime: tTime.toISOString(),
        reminderTime: tTime.toISOString(),
        isReminderActive,
        isImportant,
        stt: parsedStt !== null && !isNaN(parsedStt) ? parsedStt : null,
      }
      if (selectedNote) {
        onUpdateNote(noteData)
      } else {
        onCreateNote(noteData)
        // Reset form and local states to default values
        reset({ title: '', content: '' })
        const now = new Date()
        setTargetDate(now)
        setTargetHour(now.getHours())
        const roundedMin = Math.round(now.getMinutes() / 5) * 5
        setTargetMin(roundedMin >= 60 ? 55 : roundedMin)
        setIsReminderActive(false)
        setIsImportant(false)
        setStt('')
      }
    }

    return (
      <View className="flex-[4] justify-between bg-white p-9">
        {/* Title Header */}
        <View className="mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <Plus size={28} color={COLORS.primary.default} strokeWidth={3} className="mr-2" />
            <Text className="text-[28px] font-black tracking-tight text-surface-on">
              {selectedNote ? 'Chi tiết ghi chú' : 'Thêm ghi chú mới'}
            </Text>
          </View>
          {selectedNote && (
            <Button
              label="Tạo mới"
              variant="secondary"
              onPress={onCancelEdit}
              className="h-14 rounded-2xl border-none px-7 py-2.5"
              textClassName="text-[21px] font-black"
            />
          )}
        </View>

        {/* Main Form Fields Container (flex-1) */}
        <View className="mb-6 flex-1 gap-6">
          {/* Tiêu đề & STT */}
          <View className="flex-row gap-5">
            {/* Tiêu đề */}
            <ControlledInput
              control={control}
              name="title"
              label="Tiêu đề công việc"
              required
              placeholder="Ví dụ: Kiểm hàng bia..."
              returnKeyType="next"
              autoCorrect={false}
              labelClassName="text-[20px] font-bold text-surface-on-variant"
              containerClassName="flex-1 mb-0"
              className="h-[70px]"
              style={{ fontSize: 17 }}
            />

            {/* Số thứ tự (STT) */}
            <View className="w-[140px]">
              <Text className="mb-2 text-[20px] font-bold text-surface-on-variant">STT</Text>
              <TextInput
                keyboardType="numeric"
                placeholder="Mặc định"
                value={stt}
                onChangeText={(text) => setStt(text.replace(/[^0-9]/g, ''))}
                placeholderTextColor="#8d8e8f"
                className="h-[70px] rounded-lg border border-outline bg-white px-4 text-center font-bold text-[#0f0f0f]"
                style={{ fontSize: 18, fontFamily: 'Manrope-Medium' }}
              />
            </View>
          </View>

          {/* Ngày thực hiện */}
          <View>
            <View className="mb-2 flex-row items-center gap-2">
              <Calendar size={21} color={COLORS.muted} className="mr-1.5" />
              <Text className="text-[20px] font-bold text-surface-on-variant">Ngày thực hiện</Text>
            </View>
            <DatePicker
              value={targetDate}
              onChange={(date) => setTargetDate(date)}
              placeholder="Chọn ngày thực hiện"
              minDate={new Date()}
              triggerClassName="h-[50px]"
              triggerTextClassName="text-lg"
              triggerIconSize={23}
            />
          </View>

          {/* Bật/Tắt nhắc nhở */}
          <View className="flex-row items-center justify-between border-b border-[#f1f5f9] py-2.5">
            <View>
              <View className="flex-row items-center gap-2.5">
                <Bell size={21} color={COLORS.primary.default} className="mr-1.5" />
                <Text className="text-[20px] font-bold text-surface-on" numberOfLines={1}>
                  Kích hoạt nhắc nhở
                </Text>
              </View>
              <Text className="mt-1 text-base text-muted">Đổ chuông báo khi đến giờ hẹn</Text>
            </View>
            <Switch
              value={isReminderActive}
              onValueChange={setIsReminderActive}
              trackColor={{ false: '#cbd5e1', true: COLORS.primary.default }}
              thumbColor="white"
              style={{ transform: [{ scale: 1.15 }] }}
            />
          </View>

          {/* Giờ thực hiện (Tablet custom scroll wheel picker) */}
          {isReminderActive && (
            <View>
              <View className="flex-row items-center justify-center rounded-2xl border border-outline-variant bg-surface-100 px-6 py-2.5">
                {/* Hour Wheel */}
                <ScrollWheel
                  items={Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))}
                  selectedValue={targetHour}
                  onChange={setTargetHour}
                  itemHeight={50}
                />

                <Text className="px-8 text-4xl font-black text-muted">:</Text>

                {/* Minute Wheel (Multiples of 5: 00, 05, 10, ... 55) */}
                <ScrollWheel
                  items={Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'))}
                  selectedValue={targetMin}
                  onChange={setTargetMin}
                  itemHeight={50}
                />
              </View>
            </View>
          )}

          {/* Nội dung chi tiết */}
          <ControlledInput
            control={control}
            name="content"
            label="Nội dung chi tiết"
            placeholder="Mô tả cụ thể những gì cần thực hiện..."
            multiline
            containerClassName="flex-1 mb-0"
            className="flex-1 rounded-xl border p-4"
            style={{ textAlignVertical: 'top', minHeight: 210, fontSize: 17 }}
            labelClassName="text-[20px] font-bold text-surface-on-variant"
          />

          {/* Ghi chú quan trọng */}
          <View className="flex-row items-center justify-between border-b border-[#f1f5f9] py-2.5">
            <View>
              <View className="flex-row items-center gap-2.5">
                <Star
                  size={21}
                  color="#eab308"
                  fill={isImportant ? '#eab308' : 'transparent'}
                  className="mr-1.5"
                />
                <Text className="text-[20px] font-bold text-surface-on" numberOfLines={1}>
                  Ghi chú quan trọng
                </Text>
              </View>
              <Text className="mt-1 text-base text-muted">Lưu trữ lâu dài, không báo quá hạn</Text>
            </View>
            <Switch
              value={isImportant}
              onValueChange={setIsImportant}
              trackColor={{ false: '#cbd5e1', true: COLORS.primary.default }}
              thumbColor="white"
              style={{ transform: [{ scale: 1.15 }] }}
            />
          </View>
        </View>

        {/* Nút Tạo/Cập nhật */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          className="mt-3.5 h-[74px] items-center justify-center rounded-2xl active:scale-[0.98]"
          style={{
            backgroundColor: COLORS.primary.default,
            ...SHADOW.default,
          }}
        >
          <Text className="text-2xl font-black text-white">
            {selectedNote ? 'Cập nhật Ghi chú' : 'Tạo Ghi chú'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  },
)

CreateNoteFormColumn.displayName = 'CreateNoteFormColumn'
