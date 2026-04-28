/**
 * Thông tin thuế dùng cho việc xuất Hóa đơn điện tử (e-Invoice)
 */
export interface TaxInfo {
  /** Tên công ty / Tên tổ chức */
  companyName: string
  /** Mã số thuế (MST) */
  taxCode: string
  /** Email nhận hóa đơn điện tử */
  email: string
}

/**
 * Chuẩn hóa dữ liệu thông tin thuế từ chuỗi JSON trong Database
 */
export const sanitizeTaxInfo = (rawTax: any): TaxInfo | null => {
  if (!rawTax || typeof rawTax !== 'object') return null
  return {
    companyName: String(rawTax.companyName || rawTax.company_name || ''),
    taxCode: String(rawTax.taxCode || rawTax.tax_code || ''),
    email: String(rawTax.email || ''),
  }
}
