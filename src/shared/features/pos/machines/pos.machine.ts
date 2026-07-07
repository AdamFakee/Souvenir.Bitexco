import { ActorRefFrom, assign, enqueueActions, setup } from 'xstate'
import { cashPaymentMachine, qrPaymentMachine } from '../../payment/machines'
import { Affiliate } from '../types/cart.types'
import { CartContext, cartMachine } from './cart.machine'

export interface PosContext {
  carts: Record<string, ActorRefFrom<typeof cartMachine>>
  activeCartId: string | null
  nextCartNumber: number
}

export type PosEvent =
  | { type: 'ADD_TAB'; affiliate?: Affiliate }
  | { type: 'REMOVE_TAB'; id: string }
  | { type: 'SWITCH_TAB'; id: string }
  | { type: 'PRINT_RECEIPT' }
  | { type: 'CART_UPDATED' }
  | { type: 'ADD_ITEM'; product: any }

const createCartMeta = (affiliate?: Affiliate) => {
  const id = `cart-${Date.now()}`
  const label = affiliate ? affiliate.name : 'Khách lẻ'
  return { id, label }
}

/** ID của tab Lẻ mặc định */
const DEFAULT_CART_ID = 'cart-default'

export const posMachine = setup({
  actors: {
    cartMachine,
    qrPaymentMachine,
    cashPaymentMachine,
  },
  types: {
    context: {} as PosContext,
    events: {} as PosEvent,
    input: {} as {
      initialCarts?: { id: string; label: string; context?: Partial<CartContext> }[]
    },
  },
}).createMachine({
  id: 'pos',
  initial: 'idle',
  context: ({ spawn, input }) => {
    const carts: PosContext['carts'] = {}
    let nextCartNumber = 1
    let activeCartId: string | null = null

    // luôn spawn tab Lẻ mặc định
    const defaultCart = spawn('cartMachine', {
      id: DEFAULT_CART_ID,
      input: { id: DEFAULT_CART_ID, label: 'Khách lẻ', initialContext: { affiliate: null } },
    })
    carts[DEFAULT_CART_ID] = defaultCart
    activeCartId = DEFAULT_CART_ID

    if (input?.initialCarts) {
      input.initialCarts.forEach((c) => {
        const cartActor = spawn('cartMachine', {
          id: c.id,
          input: { id: c.id, label: c.label, initialContext: { affiliate: null, ...c.context } },
        })
        carts[c.id] = cartActor
      })

      if (input.initialCarts.length > 0) {
        activeCartId = input.initialCarts[0].id
      }
    }

    return {
      carts,
      activeCartId,
      nextCartNumber,
    }
  },
  on: {
    ADD_TAB: {
      actions: assign(({ context, event, spawn }) => {
        const affiliate = event.affiliate
        const { id, label } = createCartMeta(affiliate)
        const newCart = spawn('cartMachine', {
          id,
          input: { id, label, initialContext: { affiliate: affiliate ?? null } },
        })

        return {
          carts: { ...context.carts, [id]: newCart },
          activeCartId: id,
        }
      }),
    },
    REMOVE_TAB: {
      actions: [
        enqueueActions(({ context, event, enqueue }) => {
          const actor = context.carts[event.id]
          if (actor) {
            enqueue.stopChild(actor)
          }
        }),
        assign(({ context, event }) => {
          const { [event.id]: _, ...remaining } = context.carts
          const remainingIds = Object.keys(remaining)

          let nextActiveId = context.activeCartId
          if (context.activeCartId === event.id) {
            const removedIndex = Object.keys(context.carts).indexOf(event.id)
            nextActiveId = remainingIds[removedIndex] || remainingIds[removedIndex - 1] || null
          }

          return {
            carts: remaining,
            activeCartId: nextActiveId,
          }
        }),
      ],
    },
    SWITCH_TAB: {
      actions: assign({
        activeCartId: ({ event }) => event.id,
      }),
    },
    PRINT_RECEIPT: {},
    CART_UPDATED: {
      actions: [],
    },
    ADD_ITEM: {
      actions: enqueueActions(({ context, event, enqueue }) => {
        let targetCartId = context.activeCartId

        if (!targetCartId) {
          // fallback: spawn tab Lẻ nếu chưa có
          targetCartId = DEFAULT_CART_ID
          enqueue.assign(({ context, spawn }) => {
            const newCart = spawn('cartMachine', {
              id: DEFAULT_CART_ID,
              input: {
                id: DEFAULT_CART_ID,
                label: 'Khách lẻ 1',
                initialContext: { affiliate: null },
              },
            })
            return {
              carts: { ...context.carts, [DEFAULT_CART_ID]: newCart },
              activeCartId: DEFAULT_CART_ID,
            }
          })
        }

        enqueue.sendTo(targetCartId, {
          type: 'ADD_ITEM',
          product: event.product,
        })
      }),
    },
  },
  states: {
    idle: {},
  },
})
