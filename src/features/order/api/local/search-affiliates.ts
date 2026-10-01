import { AffiliateModel, database } from '@/shared/lib/database'
import { Q } from '@nozbe/watermelondb'

/**
 * Lấy CTV từ Local Database.
 */
export async function searchAffiliatesLocal(q?: string): Promise<AffiliateModel[]> {
  const clauses: any[] = [Q.where('is_active', true)]
  if (q) {
    clauses.push(
      Q.or(
        Q.where('name', Q.like(`%${Q.sanitizeLikeString(q)}%`)),
        Q.where('code', Q.like(`%${Q.sanitizeLikeString(q)}%`)),
        Q.where('phone', Q.like(`%${Q.sanitizeLikeString(q)}%`)),
      ),
    )
  }
  return database
    .get<AffiliateModel>('affiliates')
    .query(...clauses)
    .fetch()
}
