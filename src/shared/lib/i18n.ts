import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import Global Locales
import { en as commonEn, vi as commonVi } from '@/shared/locales'

// Import Feature Locales
import { en as aEn, vi as aVi } from '@/shared/features/a/locales'

export const defaultNS = 'common'
export const resources = {
  vi: {
    common: commonVi,
    a: aVi,
  },
  en: {
    common: commonEn,
    a: aEn,
  },
} as const

i18n.use(initReactI18next).init({
  resources,
  lng: 'vi', // Ngôn ngữ mặc định
  fallbackLng: 'en',
  defaultNS, // Namespace mặc định
})

export default i18n
