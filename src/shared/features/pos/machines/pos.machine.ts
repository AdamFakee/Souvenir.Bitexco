import { ActorRefFrom, assign, enqueueActions, setup } from 'xstate'
import { cashPaymentMachine, qrPaymentMachine } from '../../payment/machines'
import { CartProduct } from '../types/cart.types'
import { CartContext, cartMachine } from './cart.machine'

export interface PosContext {
  carts: Record<string, ActorRefFrom<typeof cartMachine>>
  activeCartId: string | null
  nextCartNumber: number
}

export type PosEvent =
  | { type: 'ADD_TAB' }
  | { type: 'REMOVE_TAB'; id: string }
  | { type: 'SWITCH_TAB'; id: string }
  | { type: 'PRINT_RECEIPT' }
  | { type: 'CART_UPDATED' }
  | { type: 'ADD_ITEM'; product: CartProduct }

const createCartMeta = (num: number) => ({
  id: `cart-${num}`,
  label: `Phiên #${num}`,
})

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

    if (input?.initialCarts) {
      input.initialCarts.forEach((c) => {
        const cartActor = spawn('cartMachine', {
          id: c.id,
          input: {
            id: c.id,
            label: c.label,
            initialContext: c.context,
          },
        })
        carts[c.id] = cartActor

        // Update nextCartNumber based on existing IDs like "cart-1", "cart-2"
        const match = c.id.match(/cart-(\d+)/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num >= nextCartNumber) nextCartNumber = num + 1
        }
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
    // Tạo mới một phiên giỏ hàng (tab)
    ADD_TAB: {
      actions: assign(({ context, spawn }) => {
        const { id, label } = createCartMeta(context.nextCartNumber)
        const newCart = spawn('cartMachine', {
          id,
          input: { id, label },
        })

        return {
          carts: { ...context.carts, [id]: newCart },
          activeCartId: id,
          nextCartNumber: context.nextCartNumber + 1,
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
    // Chuyển đổi giữa các phiên giỏ hàng hiện có
    SWITCH_TAB: {
      actions: assign({
        activeCartId: ({ event }) => event.id,
      }),
    },
    PRINT_RECEIPT: {
      // Logic for printing will be handled by UI or an external service listener
    },
    CART_UPDATED: {
      // Just a trigger for persistence
      actions: [],
    },
    // Thêm sản phẩm trực tiếp vào giỏ hàng từ màn hình chính
    ADD_ITEM: {
      actions: enqueueActions(({ context, event, enqueue }) => {
        let targetCartId = context.activeCartId

        // 1. If no active tab, create one first in the queue
        if (!targetCartId) {
          const nextNum = context.nextCartNumber
          const { id: newId, label } = createCartMeta(nextNum)
          targetCartId = newId

          enqueue.assign(({ context, spawn }) => {
            const newCart = spawn('cartMachine', {
              id: newId,
              input: { id: newId, label },
            })
            return {
              carts: { ...context.carts, [newId]: newCart },
              activeCartId: newId,
              nextCartNumber: nextNum + 1,
            }
          })
        }

        // 2. Forward the product to the active cart (newly created or existing)
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
