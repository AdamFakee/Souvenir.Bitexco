import { getPaymentMethods } from '@/features/payment/api/remote/get-payment-methods'
import { getOpenSessions } from '@/features/shift/api'
import { SyncService } from '@/shared/lib/database/sync'
import { storage } from '@/shared/lib/storage'
import { AxiosError } from 'axios'
import { assign, fromPromise, setup } from 'xstate'
import { getDeviceContext, getMe, refreshToken } from '../../auth/api'
import type { AppContext, AppEvent } from '../types/app.types'

/** Key MMKV để lưu refresh token — phải khớp với use-app-store.ts */
const REFRESH_TOKEN_KEY = 'auth-refresh-token'

/**
 * Phân biệt lỗi mạng (offline/timeout) với lỗi xác thực (401/403).
 * Network error: AxiosError không có response (request không tới server được)
 * hoặc có error code ERR_NETWORK / ECONNABORTED / ENOTFOUND.
 */
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false
  if (!error.response) return true // Request không tới server
  return false // Có response → server trả lỗi có chủ đích (401, 403, v.v.)
}

const DEFAULT_CONTEXT: AppContext = {
  device: null,
  accessToken: null,
  employee: null,
  cashSessionId: null,
  paymentMethods: null,
  tenantConfig: null,
  terminalConfig: null,
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
      terminalConfig?: AppContext['terminalConfig']
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
    saveAuth: assign(({ event, context }) => {
      if (event.type !== 'LOGIN_SUCCESS') return {}
      // refreshToken đã được lưu vào MMKV bởi login handler trước khi gửi event này
      // Giữ lại warehouseId từ device activation — login response không trả về field này
      return {
        accessToken: event.accessToken,
        employee: event.employee,
        device: {
          ...event.device,
          warehouseId: event.device.warehouseId ?? context.device?.warehouseId,
        },
        error: null,
      }
    }),
    saveShift: assign(({ event }) => {
      if (event.type !== 'SHIFT_OPENED') return {}
      console.log('[AppMachine] SHIFT_OPENED event received - cashSessionId:', event.cashSessionId)
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
      return { accessToken: null, employee: null, cashSessionId: null }
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
        if (!input.refreshToken) {
          throw new Error('No refresh token — PIN login required')
        }

        // 1. Refresh token — body mode: gửi refreshToken, nhận cặp mới (rotation)
        const { accessToken, refreshToken: newRefreshToken } = await refreshToken(
          input.refreshToken,
        )

        // 2. Lưu refresh token mới ngay lập tức (rotation bắt buộc)
        input.onTokenRotated(newRefreshToken)

        // 3. Get Employee Me — lấy permissions fresh (có thể thay đổi khi app offline)
        const employee = await getMe()

        // 4. Kiểm tra trạng thái kích hoạt thiết bị
        // Lỗi mạng/server → bỏ qua, chỉ chặn khi server xác nhận isActive=false
        let warehouseId: string | undefined
        try {
          const deviceContext = await getDeviceContext()
          if (!deviceContext.isActive) {
            const err = new Error('DEVICE_INACTIVE')
            ;(err as any).code = 'DEVICE_INACTIVE'
            throw err
          }
          warehouseId = deviceContext.warehouseId
        } catch (e: any) {
          if (e?.code === 'DEVICE_INACTIVE') throw e
        }

        // 5. Check ca đang mở — CashSession[]
        const sessions = await getOpenSessions(input.deviceId)
        const cashSessionId = sessions.length > 0 ? sessions[0].id : null

        // 6. Lấy các phương thức thanh toán khả dụng
        let paymentMethods = null
        try {
          paymentMethods = await getPaymentMethods()
        } catch {}

        return { accessToken, employee, cashSessionId, paymentMethods, warehouseId }
      },
    ),

    /**
     * Sau login thành công: check server xem có ca đang mở không
     * Tránh hardcode sang noShift — nhân viên có thể login lại khi ca vẫn còn mở
     */
    revalidateShiftFlow: fromPromise(async ({ input }: { input: { deviceId: string } }) => {
      // 1. Kiểm tra trạng thái kích hoạt thiết bị
      // Lỗi mạng/server → bỏ qua, chỉ chặn khi server xác nhận isActive=false
      let warehouseId: string | undefined
      try {
        const deviceContext = await getDeviceContext()
        if (!deviceContext.isActive) {
          const err = new Error('DEVICE_INACTIVE')
          ;(err as any).code = 'DEVICE_INACTIVE'
          throw err
        }
        warehouseId = deviceContext.warehouseId
      } catch (e: any) {
        if (e?.code === 'DEVICE_INACTIVE') throw e
      }

      // 2. Check ca đang mở — CashSession[]
      const sessions = await getOpenSessions(input.deviceId)
      const cashSessionId = sessions.length > 0 ? sessions[0].id : null

      let paymentMethods = null
      try {
        paymentMethods = await getPaymentMethods()
      } catch {}

      // 3. Kéo dữ liệu master data ngầm (offline cache)
      SyncService.pullMasterData().catch(() => {})

      return { cashSessionId, paymentMethods, warehouseId }
    }),
  },
  guards: {
    hasDevice: ({ context }) => context.device !== null,
    hasOpenSession: ({ event }) => (event as any).output?.cashSessionId !== null,
    isNetworkError: ({ event }) => isNetworkError((event as any).error),
    isDeviceInactive: ({ event }) => (event as any).error?.code === 'DEVICE_INACTIVE',
    hasCachedSession: ({ context }) => context.cashSessionId !== null,
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
    terminalConfig: input?.terminalConfig ?? null,
    // accessToken từ MMKV không dùng để skip refresh, chỉ là initial value
    accessToken: input?.accessToken ?? null,
    employee: input?.employee ?? null,
    cashSessionId: input?.cashSessionId ?? null,
  }),
  on: {
    PAYMENT_METHODS_UPDATED: {
      actions: assign({
        paymentMethods: ({ event }) => event.paymentMethods,
        tenantConfig: ({ event, context }) => {
          const bankTransferMethod = event.paymentMethods.find((m) => m.code === 'qr_bidv')
          const config = bankTransferMethod?.bankConfig ?? context.tenantConfig
          console.log('[AppMachine] tenantConfig (qr_bidv):', JSON.stringify(config, null, 2))
          return config
        },
        terminalConfig: ({ event, context }) => {
          const cardMethod = event.paymentMethods.find((m) => m.code === 'card_bidv')
          const config = cardMethod?.terminalConfig ?? context.terminalConfig
          console.log('[AppMachine] terminalConfig (card_bidv):', JSON.stringify(config, null, 2))
          return config
        },
      }),
    },
    /**
     * Interceptor silent-refresh thành công → cập nhật accessToken mới vào context.
     * Dùng assign thẳng vào context, không thay đổi state hiện tại.
     */
    ACCESS_TOKEN_REFRESHED: {
      actions: assign({
        accessToken: ({ event }) => event.accessToken,
      }),
    },
  },
  states: {
    /**
     * Khởi tạo — luôn vào refreshingAuth nếu đã có device.
     * (bất kể accessToken trong MMKV có hay không — có thể đã expired)
     */
    initializing: {
      always: [{ guard: 'hasDevice', target: 'refreshingAuth' }, { target: 'deviceInactive' }],
    },

    /**
     * App startup: Refresh token + getMe + check open sessions
     * → shiftOpen nếu có ca / unauthenticated nếu không có
     * → unauthenticated nếu refresh token hết hạn
     * → deviceLockedByServer nếu isActive = false
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
              device: ({ event, context }) =>
                context.device && event.output.warehouseId
                  ? { ...context.device, warehouseId: event.output.warehouseId }
                  : context.device,
              paymentMethods: ({ event, context }) =>
                event.output.paymentMethods ?? context.paymentMethods,
              tenantConfig: ({ event, context }) => {
                const methods = event.output.paymentMethods ?? context.paymentMethods
                const bankTransferMethod = methods?.find((m) => m.code === 'qr_bidv')
                return bankTransferMethod?.bankConfig ?? context.tenantConfig
              },
              terminalConfig: ({ event, context }) => {
                const methods = event.output.paymentMethods ?? context.paymentMethods
                const cardMethod = methods?.find((m) => m.code === 'card_bidv')
                return cardMethod?.terminalConfig ?? context.terminalConfig
              },
            }),
          },
          {
            target: 'noShift',
            actions: assign({
              accessToken: ({ event }) => event.output.accessToken,
              employee: ({ event }) => event.output.employee,
              cashSessionId: null,
              device: ({ event, context }) =>
                context.device && event.output.warehouseId
                  ? { ...context.device, warehouseId: event.output.warehouseId }
                  : context.device,
              paymentMethods: ({ event, context }) =>
                event.output.paymentMethods ?? context.paymentMethods,
              tenantConfig: ({ event, context }) => {
                const methods = event.output.paymentMethods ?? context.paymentMethods
                const bankTransferMethod = methods?.find((m) => m.code === 'qr_bidv')
                return bankTransferMethod?.bankConfig ?? context.tenantConfig
              },
              terminalConfig: ({ event, context }) => {
                const methods = event.output.paymentMethods ?? context.paymentMethods
                const cardMethod = methods?.find((m) => m.code === 'card_bidv')
                return cardMethod?.terminalConfig ?? context.terminalConfig
              },
            }),
          },
        ],
        onError: [
          {
            // Server xác nhận thiết bị bị khoá
            guard: 'isDeviceInactive',
            target: 'deviceLockedByServer',
          },
          {
            // Lỗi mạng (offline/timeout) → KHÔNG xoá token
            // Restore từ context MMKV đã có, cho user dùng tiếp
            guard: 'isNetworkError',
            target: 'restoreOffline',
          },
          {
            // Refresh token hết hạn thực sự (401/403 từ server) → logout
            target: 'unauthenticated',
            actions: 'clearAuth',
          },
        ],
      },
    },

    /**
     * Offline khi khởi động — restore context từ MMKV, không logout.
     * Token vẫn còn trong MMKV. Khi có mạng trở lại → NETWORK_RESTORED → refreshingAuth.
     */
    restoreOffline: {
      always: [{ guard: 'hasCachedSession', target: 'shiftOpen' }, { target: 'noShift' }],
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
              device: ({ event, context }) =>
                context.device && event.output.warehouseId
                  ? { ...context.device, warehouseId: event.output.warehouseId }
                  : context.device,
              paymentMethods: ({ event, context }) =>
                event.output.paymentMethods ?? context.paymentMethods,
              tenantConfig: ({ event, context }) => {
                const methods = event.output.paymentMethods ?? context.paymentMethods
                const bankTransferMethod = methods?.find((m) => m.code === 'qr_bidv')
                return bankTransferMethod?.bankConfig ?? context.tenantConfig
              },
              terminalConfig: ({ event, context }) => {
                const methods = event.output.paymentMethods ?? context.paymentMethods
                const cardMethod = methods?.find((m) => m.code === 'card_bidv')
                return cardMethod?.terminalConfig ?? context.terminalConfig
              },
            }),
          },
          {
            target: 'noShift',
            actions: assign({
              cashSessionId: null,
              device: ({ event, context }) =>
                context.device && event.output.warehouseId
                  ? { ...context.device, warehouseId: event.output.warehouseId }
                  : context.device,
              paymentMethods: ({ event, context }) =>
                event.output.paymentMethods ?? context.paymentMethods,
              tenantConfig: ({ event, context }) => {
                const methods = event.output.paymentMethods ?? context.paymentMethods
                const bankTransferMethod = methods?.find((m) => m.code === 'qr_bidv')
                return bankTransferMethod?.bankConfig ?? context.tenantConfig
              },
              terminalConfig: ({ event, context }) => {
                const methods = event.output.paymentMethods ?? context.paymentMethods
                const cardMethod = methods?.find((m) => m.code === 'card_bidv')
                return cardMethod?.terminalConfig ?? context.terminalConfig
              },
            }),
          },
        ],
        onError: [
          {
            guard: ({ event }) => (event as any).error?.code === 'DEVICE_INACTIVE',
            target: 'deviceLockedByServer',
          },
          {
            // Lỗi mạng khi check ca → vào noShift, không block user
            target: 'noShift',
            actions: assign({ cashSessionId: null }),
          },
        ],
      },
    },

    /**
     * Thiết bị bị khoá từ server (isActive = false).
     * → Màn hình: device-locked
     * → Chỉ thoát khi admin kích hoạt lại và user bấm "Kiểm tra lại"
     */
    deviceLockedByServer: {
      on: {
        DEVICE_UNLOCKED: {
          target: 'refreshingAuth',
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
        // Khi mạng phục hồi sau lần khởi động offline → validate lại với server
        NETWORK_RESTORED: {
          target: 'refreshingAuth',
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
        // Khi mạng phục hồi sau lần khởi động offline → validate lại với server
        NETWORK_RESTORED: {
          target: 'refreshingAuth',
        },
      },
    },
  },
})
