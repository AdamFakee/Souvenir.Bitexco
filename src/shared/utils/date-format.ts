/**
 * Formats a Date object to a string based on the provided format.
 * Currently supports: 'DD/MM/YYYY', 'YYYY-MM-DD'
 */
export const formatDate = (
  date: Date | string | number | null | undefined,
  format: 'DD/MM/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY',
): string => {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`
  }

  return `${day}/${month}/${year}`
}

/**
 * Formats a Date object to a 'dd/MM/yyyy - HH:mm' string.
 */
export const formatDateTime = (date: Date | string | number | null | undefined): string => {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return `${day}/${month}/${year} - ${hours}:${minutes}`
}

/**
 * Returns an array of day names in Vietnamese.
 */
export const getVietnameseDays = () => ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/**
 * Returns the name of the month in Vietnamese.
 */
export const getVietnameseMonth = (monthIndex: number) => {
  return `Tháng ${monthIndex + 1}`
}

/**
 * Chuyển đổi và định dạng thời gian vào ca sang giờ địa phương (GMT+7).
 * Xử lý cả định dạng ISO datetime ("2026-09-14T07:48:49.879Z") và định dạng UTC "HH:mm" ("07:48").
 */
export const formatShiftStartDisplay = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '--:--'
  const trimmed = timeStr.trim()

  // Trường hợp backend trả "HH:mm" theo giờ UTC (ví dụ "07:48")
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hStr, mStr] = trimmed.split(':')
    const utcHours = parseInt(hStr, 10)
    const utcMinutes = parseInt(mStr, 10)
    const timezoneOffsetHours = -new Date().getTimezoneOffset() / 60
    const localHours = (utcHours + timezoneOffsetHours + 24) % 24
    return `${String(Math.floor(localHours)).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`
  }

  // Trường hợp trả dạng ISO string hoặc datetime
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  return trimmed
}

/**
 * Returns a new Date object set to the beginning of the day (00:00:00.000).
 */
export const startOfDay = (date: Date): Date => {
  const newDate = new Date(date)
  newDate.setHours(0, 0, 0, 0)
  return newDate
}

/**
 * Returns a new Date object set to the end of the day (23:59:59.999).
 */
export const endOfDay = (date: Date): Date => {
  const newDate = new Date(date)
  newDate.setHours(23, 59, 59, 999)
  return newDate
}
