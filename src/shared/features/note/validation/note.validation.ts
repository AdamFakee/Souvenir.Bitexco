import * as v from 'valibot'

export const NoteFormSchema = v.object({
  title: v.pipe(
    v.string(),
    v.minLength(1, 'Vui lòng nhập tiêu đề ghi chú'),
    v.maxLength(200, 'Tiêu đề không được vượt quá 200 ký tự'),
  ),
  content: v.pipe(v.string(), v.maxLength(2000, 'Nội dung không được vượt quá 2000 ký tự')),
})

export type NoteFormValues = v.InferOutput<typeof NoteFormSchema>
