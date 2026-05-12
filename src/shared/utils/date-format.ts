/**
 * Formats a Date object to a string based on the provided format.
 * Currently supports: 'DD/MM/YYYY', 'YYYY-MM-DD'
 */
export const formatDate = (
  date: Date | null,
  format: 'DD/MM/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY',
): string => {
  if (!date) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`
  }

  return `${day}/${month}/${year}`
}

/**
 * Formats a Date object to a 'dd/MM/yyyy - HH:mm' string.
 */
export const formatDateTime = (date: Date | null): string => {
  if (!date) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

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
