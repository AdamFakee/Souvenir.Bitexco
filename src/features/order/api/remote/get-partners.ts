import { AxiosService } from '@/shared/lib/axios/axios.service'
import { Partner } from '@/shared/types'

/**
 * Tra cứu danh sách Đối tác (partner).
 */
export async function getPartnersRemote(params?: {
  search?: string
  page?: number
  limit?: number
  isActive?: boolean
  hasTransaction?: boolean
}): Promise<{ items: Partner[]; totalCount: number; page: number; pageSize: number }> {
  const response = await AxiosService.getInstance().get<any>('/v1/pos/partners', {
    params: {
      search: params?.search || undefined,
      page: params?.page || undefined,
      limit: params?.limit || undefined,
      isActive: params?.isActive !== undefined ? params.isActive : undefined,
      hasTransaction: params?.hasTransaction !== undefined ? params.hasTransaction : undefined,
    },
  })

  const resData = response.data
  const rawItems: any[] = Array.isArray(resData)
    ? resData
    : resData?.data?.items || resData?.items || resData?.data || []

  const items: Partner[] = rawItems.map((item: any) => ({
    id: String(item.id),
    code: String(item.code || ''),
    nameVi: String(item.nameVi || item.name_vi || item.name || ''),
    nameEn: item.nameEn || item.name_en || null,
    companyName: item.companyName || item.company_name || null,
    taxId: item.taxId || item.tax_id || null,
    address: item.address || null,
    representative: item.representative || null,
    representativeTitle: item.representativeTitle || item.representative_title || null,
    phone: item.phone ? String(item.phone) : '',
    email: item.email || null,
    debtCode: item.debtCode || item.debt_code || null,
    sapCode: item.sapCode || item.sap_code || null,
    invoiceEmail: item.invoiceEmail || item.invoice_email || null,
    otherEmail: item.otherEmail || item.other_email || null,
    allowCredit:
      item.allowCredit !== undefined
        ? Boolean(item.allowCredit)
        : Boolean(item.allow_credit ?? false),
    creditLimit: item.creditLimit || item.credit_limit || 0,
    remainingCredit: item.remainingCredit || item.remaining_credit || 0,
    isActive:
      item.isActive !== undefined
        ? Boolean(item.isActive)
        : Boolean(item.is_active ?? (item.state === 'ACTIVE' || true)),
  }))

  return {
    items,
    totalCount: resData?.totalCount || resData?.data?.totalCount || items.length,
    page: resData?.page || resData?.data?.page || params?.page || 0,
    pageSize: resData?.pageSize || resData?.data?.pageSize || params?.limit || 10,
  }
}
