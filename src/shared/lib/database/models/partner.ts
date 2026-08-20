import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

export default class PartnerModel extends Model {
  static table = 'partners'

  @field('code') code!: string
  @field('name_vi') nameVi!: string
  @field('name_en') nameEn?: string | null
  @field('company_name') companyName?: string | null
  @field('tax_id') taxId?: string | null
  @field('address') address?: string | null
  @field('representative') representative?: string | null
  @field('representative_title') representativeTitle?: string | null
  @field('phone') phone?: string | null
  @field('email') email?: string | null
  @field('debt_code') debtCode?: string | null
  @field('sap_code') sapCode?: string | null
  @field('invoice_email') invoiceEmail?: string | null
  @field('other_email') otherEmail?: string | null
  @field('allow_credit') allowCredit!: boolean
  @field('credit_limit') creditLimit?: number | null
  @field('remaining_credit') remainingCredit?: number | null
  @field('is_active') isActive!: boolean
  @field('version') version!: number
  @readonly @date('updated_at') updatedAt!: Date
}
