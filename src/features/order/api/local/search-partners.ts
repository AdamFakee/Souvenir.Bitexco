import { database, PartnerModel } from '@/shared/lib/database'
import { Q } from '@nozbe/watermelondb'

/**
 * Lấy Đối tác từ Local Database.
 */
export async function searchPartnersLocal(q?: string): Promise<PartnerModel[]> {
  const clauses: any[] = [Q.where('is_active', true)]
  if (q) {
    clauses.push(
      Q.or(
        Q.where('name_vi', Q.like(`%${Q.sanitizeLikeString(q)}%`)),
        Q.where('code', Q.like(`%${Q.sanitizeLikeString(q)}%`)),
        Q.where('phone', Q.like(`%${Q.sanitizeLikeString(q)}%`)),
      ),
    )
  }
  return database
    .get<PartnerModel>('partners')
    .query(...clauses)
    .fetch()
}
