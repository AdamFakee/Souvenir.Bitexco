import { useSelector } from '@xstate/react'
import { ActorRefFrom } from 'xstate'
import { cartMachine } from '../machines/cart.machine'
import { usePosActor } from './use-pos-actor'

export function useActiveCart(): ActorRefFrom<typeof cartMachine> | undefined {
  const posActor = usePosActor()

  return useSelector(posActor!, (s) => {
    if (!s) return undefined
    const id = s.context.activeCartId
    return id ? s.context.carts[id] : undefined
  }) as ActorRefFrom<typeof cartMachine> | undefined
}
