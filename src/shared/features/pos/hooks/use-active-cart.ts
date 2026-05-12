import { useSelector } from '@xstate/react'
import { ActorRefFrom } from 'xstate'
import { cartMachine } from '../machines/cart.machine'
import { usePosActor } from './use-pos-actor'

export function useActiveCart(): ActorRefFrom<typeof cartMachine> | undefined {
  const posActor = usePosActor()

  const activeCartId = useSelector(posActor!, (s) => s?.context?.activeCartId)
  const activeCartActor = useSelector(posActor!, (s) =>
    activeCartId ? s?.context?.carts[activeCartId] : undefined,
  )

  if (!posActor) return undefined

  return activeCartActor
}
