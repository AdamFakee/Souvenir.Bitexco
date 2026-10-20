import { database } from '@/shared/lib/database'
import { escapeLike, getProducts } from './get-products'

jest.mock('@/shared/lib/database', () => ({
  database: {
    get: jest.fn(),
  },
}))

describe('getProducts (Offline Search Priority - Note 22)', () => {
  let mockFetch: jest.Mock
  let mockQuery: jest.Mock
  let mockCollection: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch = jest.fn().mockResolvedValue([])
    mockQuery = jest.fn().mockReturnValue({ fetch: mockFetch })
    mockCollection = { query: mockQuery }
    ;(database.get as jest.Mock).mockReturnValue(mockCollection)
  })

  describe('escapeLike utility', () => {
    it('escapes %, _, and \\ properly', () => {
      expect(escapeLike('buil')).toBe('buil')
      expect(escapeLike('100%')).toBe('100\\%')
      expect(escapeLike('test_item')).toBe('test\\_item')
      expect(escapeLike('a\\b')).toBe('a\\\\b')
    })
  })

  describe('Empty search query', () => {
    it('queries with standard filters, sorting and pagination when searchQuery is missing', async () => {
      await getProducts({ page: 0, limit: 10 })

      expect(database.get).toHaveBeenCalledWith('products')
      expect(mockQuery).toHaveBeenCalled()
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('Search query with priority ranking', () => {
    it('generates unsafeSqlQuery with Priority 1, 2, 3 and deterministic sort', async () => {
      await getProducts({ searchQuery: 'buil', page: 1, limit: 15 })

      expect(database.get).toHaveBeenCalledWith('products')
      expect(mockQuery).toHaveBeenCalledTimes(1)

      const queryArg = mockQuery.mock.calls[0][0]
      expect(queryArg.type).toBe('sqlQuery')
      expect(queryArg.sql).toContain('CASE')
      expect(queryArg.sql).toContain('THEN 1')
      expect(queryArg.sql).toContain('THEN 2')
      expect(queryArg.sql).toContain('ELSE 3')
      expect(queryArg.sql).toContain('"products"."name" ASC')
      expect(queryArg.sql).toContain('"products"."id" ASC')

      // Verify parameter bindings:
      // WHERE: 4 substring patterns ('%buil%')
      // Priority 1: 4 prefix patterns ('buil%')
      // Priority 2: 2 word-prefix patterns ('% buil%')
      // Pagination: limit (15), offset (15)
      expect(queryArg.values).toEqual([
        '%buil%',
        '%buil%',
        '%buil%',
        '%buil%',
        'buil%',
        'buil%',
        'buil%',
        'buil%',
        '% buil%',
        '% buil%',
        15,
        15,
      ])
    })

    it('falls back to standard query if unsafeSqlQuery throws', async () => {
      mockQuery.mockImplementationOnce(() => {
        throw new Error('Unsafe SQL not supported')
      })
      mockQuery.mockReturnValueOnce({ fetch: mockFetch })

      const result = await getProducts({ searchQuery: 'buil', page: 0, limit: 10 })

      expect(database.get).toHaveBeenCalledWith('products')
      expect(mockQuery).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })
  })
})
