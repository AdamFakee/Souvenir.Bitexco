import { assign, setup, fromPromise } from 'xstate'
import type { AppContext, AppEvent } from '../types/app.types'
import { AuthAPI } from '../../auth/api/auth.api'
import { ShiftRemoteAPI } from '../../shift/api/remote/shift.remote.api'
import { PaymentRemoteAPI } from '../../payment/api/remote/payment.remote.api'
import { storage } from '@/shared/lib/storage'

/** Key MMKV để lưu refresh token — phải khớp với use-app-store.ts */
const REFRESH_TOKEN_KEY = 'auth-refresh-token'

const DEFAULT_CONTEXT: AppContext = {
  device: null,
  accessToken: null,
  employee: null,
  cashSessionId: null,
  paymentMethods: null,
  tenantConfig: null,
  error: null,
}

export const appMachine = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent,
    input: {} as {
      // Dữ liệu persist đọc từ MMKV khi khởi tạo
      device?: AppContext['device']
      paymentMethods?: AppContext['paymentMethods']
      tenantConfig?: AppContext['tenantConfig']
      accessToken?: AppContext['accessToken']
      employee?: AppContext['employee']
      cashSessionId?: AppContext['cashSessionId']
    },
  },
  actions: {
    saveDevice: assign(({ event }) => {
      if (event.type !== 'DEVICE_ACTIVATED') return {}
      return { device: event.device, error: null }
    }),
    saveAuth: assign(({ event }) => {
      if (event.type !== 'LOGIN_SUCCESS') return {}
      // refreshToken đã được lưu vào MMKV bởi login handler trước khi gửi event này
      return {
        accessToken: event.accessToken,
        employee: event.employee,
        device: event.device, // refresh device.status từ login response
        error: null,
      }
    }),
    saveShift: assign(({ event }) => {
      if (event.type !== 'SHIFT_OPENED') return {}
      return { cashSessionId: event.cashSessionId, error: null }
    }),
    clearShift: assign({ cashSessionId: null }),
    /**
     * Xoá auth in-memory VÀ wipe refreshToken khỏi MMKV.
     * Ghi thẳng vào storage — tránh circular import với use-app-store.
     */
    clearAuth: assign(() => {
      try {
        storage.remove(REFRESH_TOKEN_KEY)
      } catch {}
      return { accessToken: null, employee: null }
    }),
    resetDevice: assign(() => {
      try {
        storage.remove(REFRESH_TOKEN_KEY)
      } catch {}
      return DEFAULT_CONTEXT
    }),
  },
  actors: {
    /**
     * App startup: Refresh token → getMe (permissions fresh) → check ca đang mở
     * input.refreshToken đọc từ MMKV bởi use-app-store trước khi invoke.
     * input.onTokenRotated: callback để lưu token mới — tránh circular import.
     * ⚠️ Nếu refreshToken null → throw ngay → onError → unauthenticated (PIN login).
     */
    refreshAuthFlow: fromPromise(
      async ({
        input,
      }: {
        input: {
          deviceId: string
          refreshToken: string | null
          onTokenRotated: (newToken: string) => void
        }
      }) => {
        console.log('[appMachine] Starting refresh flow...')

        if (!input.refreshToken) {
          throw new Error('No refresh token — PIN login required')
        }

        // 1. Refresh token — body mode: gửi refreshToken, nhận cặp mới (rotation)
        const { accessToken, refreshToken: newRefreshToken } = await AuthAPI.refresh(
          input.refreshToken,
        )

        // 2. Lưu refresh token mới ngay lập tức (rotation bắt buộc)
        input.onTokenRotated(newRefreshToken)

        // 3. Get Employee Me — lấy permissions fresh (có thể thay đổi khi app offline)
        const employee = await AuthAPI.getMe()

        // 4. Check ca đang mở — CashSession[]
        const sessions = await ShiftRemoteAPI.getOpenSessions(input.deviceId)
        const cashSessionId = sessions.length > 0 ? sessions[0].id : null

        // 5. Lấy các phương thức thanh toán khả dụng
        let paymentMethods = null
        try {
          paymentMethods = await PaymentRemoteAPI.getPaymentMethods()
        } catch (e) {
          console.error('[appMachine] Failed to fetch payment methods during startup:', e)
        }

        console.log('[appMachine] Refresh flow completed:', {
          accessToken: '***',
          employee: employee.displayName,
          cashSessionId,
          paymentMethodsCount: paymentMethods?.length || 0,
        })
        return { accessToken, employee, cashSessionId, paymentMethods }
      },
    ),

    /**
     * Sau login thành công: check server xem có ca đang mở không
     * Tránh hardcode sang noShift — nhân viên có thể login lại khi ca vẫn còn mở
     */
    revalidateShiftFlow: fromPromise(async ({ input }: { input: { deviceId: string } }) => {
      console.log('[appMachine] Revalidating shift after login...')
      const sessions = await ShiftRemoteAPI.getOpenSessions(input.deviceId)
      const cashSessionId = sessions.length > 0 ? sessions[0].id : null

      let paymentMethods = null
      try {
        paymentMethods = await PaymentRemoteAPI.getPaymentMethods()
      } catch (e) {
        console.error('[appMachine] Failed to fetch payment methods during revalidation:', e)
      }

      console.log('[appMachine] Revalidate shift result:', {
        cashSessionId,
        paymentMethodsCount: paymentMethods?.length || 0,
      })
      return { cashSessionId, paymentMethods }
    }),
  },
  guards: {
    hasDevice: ({ context }) => context.device !== null,
    hasOpenSession: ({ event }) => (event as any).output?.cashSessionId !== null,
  },
}).createMachine({
  id: 'app',
  /**
   * Luôn bắt đầu từ initializing → refreshingAuth nếu có device.
   * Trên React Native, accessToken persist trong MMKV nhưng có thể đã expired.
   * Không dùng accessToken từ MMKV để skip refresh — luôn validate lại.
   */
  initial: 'initializing',
  context: ({ input }) => ({
    ...DEFAULT_CONTEXT,
    device: input?.device ?? null,
    paymentMethods: input?.paymentMethods ?? null,
    tenantConfig: input?.tenantConfig ?? null,
    // accessToken từ MMKV không dùng để skip refresh, chỉ là initial value
    accessToken: input?.accessToken ?? null,
    employee: input?.employee ?? null,
    cashSessionId: input?.cashSessionId ?? null,
  }),
  states: {
    /**
     * Khởi tạo — luôn vào refreshingAuth nếu đã có device
     * (bất kể accessToken trong MMKV có hay không — có thể đã expired)
     */
    initializing: {
      always: [{ guard: 'hasDevice', target: 'refreshingAuth' }, { target: 'deviceInactive' }],
    },

    /**
     * App startup: Refresh token + getMe + check open sessions
     * → shiftOpen nếu có ca / noShift nếu không có
     * → unauthenticated nếu refresh token hết hạn
     */
    refreshingAuth: {
      invoke: {
        src: 'refreshAuthFlow',
        input: ({ context }) => ({
          deviceId: context.device!.id,
          refreshToken: storage.getString(REFRESH_TOKEN_KEY) ?? null,
          onTokenRotated: (newToken: string) => {
            try {
              storage.set(REFRESH_TOKEN_KEY, newToken)
            } catch {}
          },
        }),
        onDone: [
          {
            guard: ({ event }) => event.output.cashSessionId !== null,
            target: 'shiftOpen',
            actions: assign({
              accessToken: ({ event }) => event.output.accessToken,
              employee: ({ event }) => event.output.employee,
              cashSessionId: ({ event }) => event.output.cashSessionId,
              paymentMethods: ({ event, context }) =>
                event.output.paymentMethods ?? context.paymentMethods,
            }),
          },
          {
            target: 'noShift',
            actions: assign({
              accessToken: ({ event }) => event.output.accessToken,
              employee: ({ event }) => event.output.employee,
              cashSessionId: null,
              paymentMethods: ({ event, context }) =>
                event.output.paymentMethods ?? context.paymentMethods,
            }),
          },
        ],
        onError: {
          // Refresh token hết hạn (401) → cần đăng nhập lại
          target: 'unauthenticated',
          actions: 'clearAuth',
        },
      },
    },

    /**
     * Máy chưa được kích hoạt.
     * → Màn hình: device-activation
     */
    deviceInactive: {
      on: {
        DEVICE_ACTIVATED: {
          target: 'unauthenticated',
          actions: 'saveDevice',
        },
      },
    },

    /**
     * Máy đã kích hoạt nhưng chưa có nhân viên đăng nhập.
     * → Màn hình: staff-login
     */
    unauthenticated: {
      on: {
        LOGIN_SUCCESS: {
          // Không hardcode noShift — check server trước
          target: 'revalidatingShift',
          actions: 'saveAuth',
        },
        DEVICE_RESET: {
          target: 'deviceInactive',
          actions: 'resetDevice',
        },
      },
    },

    /**
     * Sau login: check server xem có ca đang mở không
     * → shiftOpen (re-login giữa ca) hoặc noShift (ca mới)
     */
    revalidatingShift: {
      invoke: {
        src: 'revalidateShiftFlow',
        input: ({ context }) => ({ deviceId: context.device!.id }),
        onDone: [
          {
            guard: ({ event }) => event.output.cashSessionId !== null,
            target: 'shiftOpen',
            actions: assign({
              cashSessionId: ({ event }) => event.output.cashSessionId,
              paymentMethods: ({ event, context }) =>
                event.output.paymentMethods ?? context.paymentMethods,
            }),
          },
          {
            target: 'noShift',
            actions: assign({
              cashSessionId: null,
              paymentMethods: ({ event, context }) =>
                event.output.paymentMethods ?? context.paymentMethods,
            }),
          },
        ],
        onError: {
          // Lỗi mạng khi check ca → vào noShift, không block user
          target: 'noShift',
          actions: assign({ cashSessionId: null }),
        },
      },
    },

    /**
     * Nhân viên đã đăng nhập nhưng chưa mở ca.
     * → Màn hình: open-shift
     */
    noShift: {
      on: {
        SHIFT_OPENED: {
          target: 'shiftOpen',
          actions: 'saveShift',
        },
        LOGGED_OUT: {
          target: 'unauthenticated',
          actions: 'clearAuth',
        },
        TOKEN_EXPIRED: {
          target: 'unauthenticated',
          actions: 'clearAuth',
        },
      },
    },

    /**
     * Ca đang mở — trạng thái bán hàng bình thường.
     * → Màn hình: (tab) pos / orders / dashboard / shift
     */
    shiftOpen: {
      on: {
        SHIFT_CLOSED: {
          target: 'noShift',
          actions: 'clearShift',
        },
        LOGGED_OUT: {
          target: 'unauthenticated',
          actions: 'clearAuth',
        },
        TOKEN_EXPIRED: {
          target: 'unauthenticated',
          actions: 'clearAuth',
        },
      },
    },
  },
})
