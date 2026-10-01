import { t } from '@/shared/locales'
import { toast } from '@/shared/store'
import { AppError } from './app-error'

/**
 * Hàm lấy thông điệp lỗi dịch tự động theo i18nKey hoặc fallback userMessage
 */
export function getLocalizedErrorMessage(error: AppError): string {
  const translated = t(error.i18nKey, error.i18nParams)

  if (translated && translated !== error.i18nKey) {
    return translated
  }

  if (error.userMessage) {
    return error.userMessage
  }

  return error.code
}

/**
 * Hàm xử lý lỗi tập trung đa ngôn ngữ 100% cho UI Presentation Layer
 */
export function handleAppError(error: unknown): void {
  if (error instanceof AppError) {
    const localizedMessage = getLocalizedErrorMessage(error)

    switch (error.category) {
      case 'AUTH':
        toast.error(localizedMessage, t('errors.titles.auth'))
        break

      case 'HARDWARE':
        toast.infoPopup({
          title: t('errors.titles.hardware'),
          message: `${localizedMessage}\n(Code: ${error.code})`,
        })
        break

      case 'NETWORK':
        toast.warning(localizedMessage, t('errors.titles.network'))
        break

      default:
        toast.error(localizedMessage, t('errors.titles.general'))
        break
    }
  } else if (error instanceof Error) {
    toast.error(error.message || t('errors.messages.unknown'), t('errors.titles.unknown'))
  } else {
    toast.error(t('errors.messages.unknown'), t('errors.titles.unknown'))
  }
}
