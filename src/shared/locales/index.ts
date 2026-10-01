import { en } from './en'
import { vi } from './vi'

export type LocaleType = 'vi' | 'en'

const dictionaries: Record<LocaleType, any> = {
  vi,
  en,
}

let currentLocale: LocaleType = 'vi'

export function setLocale(locale: LocaleType) {
  currentLocale = locale
}

export function getLocale(): LocaleType {
  return currentLocale
}

/**
 * Hàm tra cứu và dịch đa ngôn ngữ i18n theo key & params
 */
export function t(key: string, params?: Record<string, any>, locale?: LocaleType): string {
  const activeLocale = locale || currentLocale
  const dict = dictionaries[activeLocale] || vi

  const keys = key.split('.')
  let result: any = dict

  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k]
    } else {
      result = null
      break
    }
  }

  if (typeof result !== 'string') {
    // Trả về fallback key nếu không tìm thấy trong từ điển
    return key
  }

  if (params) {
    return Object.entries(params).reduce((acc, [pKey, pValue]) => {
      return acc.replace(new RegExp(`{{\\s*${pKey}\\s*}}`, 'g'), String(pValue))
    }, result)
  }

  return result
}

export { en, vi }
