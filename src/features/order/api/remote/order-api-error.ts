export class OrderApiError extends Error {
  code?: string
  status?: number
  traceId?: string

  constructor(message: string, options?: { code?: string; status?: number; traceId?: string }) {
    super(message)
    this.name = 'OrderApiError'
    this.code = options?.code
    this.status = options?.status
    this.traceId = options?.traceId
  }
}
