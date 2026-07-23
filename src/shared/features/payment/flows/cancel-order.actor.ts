import { OrderRemoteAPI } from '@/shared/features/order/api/remote/order.remote.api'
import { fromPromise } from 'xstate'

export type CancelOrderActorInput = {
  orderId: string | null
  shiftId: string
  staffId: string
}

/** Shared cancel-order actor; reason is fixed per machine instance. */
export function createCancelOrderActor(reason: string, logTag: string) {
  return fromPromise(async ({ input }: { input: CancelOrderActorInput }): Promise<void> => {
    if (!input.orderId) return
    try {
      await OrderRemoteAPI.cancelOrder({
        orderId: input.orderId,
        shiftId: input.shiftId,
        staffId: input.staffId,
        reason,
      })
    } catch (err) {}
  })
}
