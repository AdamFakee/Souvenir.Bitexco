import { useAppStore } from '@/shared/features/app'
import { AuthAPI } from '@/shared/features/auth'
import { OrderLocalAPI } from '@/shared/features/order/api/local/order.local.api'
import { usePosStore } from '@/shared/features/pos/store/use-pos-store'
import { SyncService } from '@/shared/lib/database/sync/sync.service'
import { PrinterService } from '@/shared/services'
import { toast } from '@/shared/store'
import { useConnectionStore } from '@/shared/store/use-connection-store'
import { assign, fromPromise, setup } from 'xstate'
import { ShiftRemoteAPI, ZReportResponse } from '../api/remote/shift.remote.api'

// ─── Machine Types ────────────────────────────────────────────────────────────

export interface CloseShiftContext {
  shiftId: string
  printRef: React.RefObject<unknown>

  // Expected stats from server and actual counted cash entered by cashier
  expectedEndingCash: number
  actualEndingCash: number
  discrepancyReason: string
  unsyncedCount: number

  // Final Z-Report payload
  zReportData: ZReportResponse | null
  error: string | null
}

export type CloseShiftEvent =
  | { type: 'START' }
  | { type: 'CHECK_SYNC_STATUS' }
  | { type: 'SET_ACTUAL_CASH'; amount: number }
  | { type: 'SET_DISCREPANCY_REASON'; reason: string }
  | { type: 'SYNC' }
  | { type: 'SUBMIT' }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }

export type CloseShiftMachineInput = {
  shiftId: string
  printRef: React.RefObject<unknown>
}

// ─── Machine ──────────────────────────────────────────────────────────────────

export const closeShiftMachine = setup({
  types: {
    context: {} as CloseShiftContext,
    events: {} as CloseShiftEvent,
    input: {} as CloseShiftMachineInput,
  },
  actors: {
    /**
     * Tích hợp kiểm tra online, đếm đơn local chưa đồng bộ và lấy số dư expected
     */
    checkSyncAndStats: fromPromise(async ({ input }: { input: { shiftId: string } }) => {
      // 1. Kiểm tra trạng thái mạng
      const isOnline = useConnectionStore.getState().isNetworkConnected
      if (!isOnline) {
        throw new Error('OFFLINE')
      }

      // 2. Kiểm tra số lượng đơn chưa đồng bộ
      const unsyncedCount = await OrderLocalAPI.getUnsyncedOrdersCount()
      if (unsyncedCount > 0) {
        return { unsyncedCount, expectedEndingCash: 0 }
      }

      // 3. Tải số liệu chốt ca dự kiến từ Server
      const stats = await ShiftRemoteAPI.getShiftStatistics(input.shiftId)
      return {
        unsyncedCount: 0,
        expectedEndingCash: stats.expectedEndingCash,
      }
    }),

    /**
     * Kích hoạt đồng bộ hóa dữ liệu SQLite local
     */
    syncData: fromPromise(async () => {
      await SyncService.drainOutbox()
    }),

    /**
     * Thực thi quy trình chốt ca trực tuyến 3 bước OCC và lấy báo cáo Z
     */
    closeShift: fromPromise(
      async ({
        input,
      }: {
        input: { shiftId: string; actualEndingCash: number; discrepancyReason: string }
      }): Promise<ZReportResponse | null> => {
        // Lấy chi tiết ca để lấy phiên bản OCC thực tế trên server
        const session = await ShiftRemoteAPI.getShiftById(input.shiftId)
        let currentVersion = session.version
        let currentState = session.state

        // Bước 1: transition 'start_close' -> chỉ gọi nếu ca đang OPEN
        if (currentState === 'OPEN') {
          await ShiftRemoteAPI.closeShift(input.shiftId, {
            action: 'start_close',
            expectedVersion: currentVersion,
          })
          // Re-fetch để lấy version chính xác — không phụ thuộc format response của transitions
          const updated = await ShiftRemoteAPI.getShiftById(input.shiftId)
          currentVersion = updated.version
          currentState = updated.state
        }

        // Bước 2: transition 'submit_count' -> gọi nếu ca đang CLOSING
        if (currentState === 'CLOSING') {
          await ShiftRemoteAPI.closeShift(input.shiftId, {
            action: 'submit_count',
            expectedVersion: currentVersion,
            countedCash: input.actualEndingCash,
            notes: input.discrepancyReason || null,
          })
          // Re-fetch để lấy version chính xác
          const updated = await ShiftRemoteAPI.getShiftById(input.shiftId)
          currentVersion = updated.version
          currentState = updated.state
        }

        // Bước 3: transition 'resolve' -> gọi nếu ca đang RECONCILING
        if (currentState === 'RECONCILING') {
          await ShiftRemoteAPI.closeShift(input.shiftId, {
            action: 'resolve',
            expectedVersion: currentVersion,
          })
          currentState = 'CLOSED'
        }

        const zReportData = await ShiftRemoteAPI.getZReport(input.shiftId)
        return zReportData
      },
    ),
    printZReport: fromPromise(async ({ input }: { input: { printRef: React.RefObject<any> } }) => {
      await new Promise((resolve) => setTimeout(resolve, 200))
      if (input.printRef && input.printRef.current) {
        await PrinterService.printComponent(input.printRef)
      }
    }),
  },
  actions: {
    assignSyncStatusAndStats: assign({
      unsyncedCount: ({ event }) => (event as any).output?.unsyncedCount ?? 0,
      expectedEndingCash: ({ event }) => (event as any).output?.expectedEndingCash ?? 0,
      error: null,
    }),
    setActualCash: assign({
      actualEndingCash: ({ event }) => (event.type === 'SET_ACTUAL_CASH' ? event.amount : 0),
    }),
    setDiscrepancyReason: assign({
      discrepancyReason: ({ event }) =>
        event.type === 'SET_DISCREPANCY_REASON' ? event.reason : '',
    }),
    assignZReportData: assign({
      zReportData: ({ event }) => (event as any).output ?? null,
      error: null,
    }),
    recordError: assign({
      error: ({ event }) => {
        const err = (event as { error?: unknown }).error
        let errMsg = 'Có lỗi xảy ra'
        if (err && typeof err === 'object') {
          const axiosErr = err as any
          if (axiosErr.response?.status === 403) {
            return 'Bạn không có quyền kết ca.'
          }
          if (axiosErr.response?.data) {
            const serverData = axiosErr.response.data
            errMsg = serverData.error || serverData.message || errMsg
          }
        }
        if (errMsg === 'Có lỗi xảy ra' && err instanceof Error) {
          errMsg = err.message
        }
        return errMsg
      },
    }),
    clearError: assign({ error: null }),
    toastError: ({ context }) => {
      const msg = context.error || 'Lỗi không xác định'
      if (msg === 'OFFLINE') return
      toast.error(msg)
    },
    resetContext: assign(({ event }) => {
      const base = {
        expectedEndingCash: 0,
        actualEndingCash: 0,
        discrepancyReason: '',
        unsyncedCount: 0,
        zReportData: null,
        error: null,
      }
      return base
    }),
    triggerLogout: () => {
      // Clear POS cart store on shift close
      try {
        usePosStore.getState().resetPos()
      } catch (err) {
        console.error('Failed to reset POS on shift close:', err)
      }

      const store = useAppStore.getState()
      const appService = store.appService
      if (appService) {
        // Lấy refreshToken từ MMKV trước khi machine clearRefreshToken
        const refreshToken = store.getRefreshToken()
        // Fire-and-forget: revoke server-side, không block UI
        if (refreshToken) {
          AuthAPI.logout(refreshToken).catch(() => {})
        }
        toast.success('Đóng ca thành công! Đang tiến hành đăng xuất...')
        setTimeout(() => {
          appService.send({ type: 'LOGGED_OUT' })
        }, 800)
      }
    },
  },
}).createMachine({
  id: 'closeShift',
  initial: 'idle',
  context: ({ input }) => ({
    shiftId: input.shiftId,
    printRef: input.printRef,
    expectedEndingCash: 0,
    actualEndingCash: 0,
    discrepancyReason: '',
    unsyncedCount: 0,
    zReportData: null,
    error: null,
  }),
  states: {
    idle: {
      on: {
        START: {
          target: 'checkingSyncStatus',
          actions: 'resetContext',
        },
      },
    },

    checkingSyncStatus: {
      on: {
        CANCEL: {
          target: 'cancelled',
        },
      },
      invoke: {
        id: 'checkSyncAndStats',
        src: 'checkSyncAndStats',
        input: ({ context }) => ({ shiftId: context.shiftId }),
        onDone: [
          {
            target: 'unsyncedWarning',
            guard: ({ event }) => event.output.unsyncedCount > 0,
            actions: 'assignSyncStatusAndStats',
          },
          {
            target: 'readyToClose',
            actions: 'assignSyncStatusAndStats',
          },
        ],
        onError: [
          {
            target: 'offlineError',
            guard: ({ event }) => (event.error as Error)?.message === 'OFFLINE',
            actions: 'recordError',
          },
          {
            target: 'idle',
            actions: ['recordError', 'toastError'],
          },
        ],
      },
    },

    offlineError: {
      on: {
        RETRY: {
          target: 'checkingSyncStatus',
          actions: 'clearError',
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    unsyncedWarning: {
      on: {
        SYNC: {
          target: 'syncing',
          actions: 'clearError',
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    syncing: {
      invoke: {
        id: 'syncData',
        src: 'syncData',
        onDone: {
          target: 'checkingSyncStatus',
        },
        onError: {
          target: 'unsyncedWarning',
          actions: ['recordError', 'toastError'],
        },
      },
    },

    readyToClose: {
      on: {
        SET_ACTUAL_CASH: {
          actions: 'setActualCash',
        },
        SET_DISCREPANCY_REASON: {
          actions: 'setDiscrepancyReason',
        },
        SUBMIT: {
          target: 'closing',
          actions: 'clearError',
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    closing: {
      invoke: {
        id: 'closeShift',
        src: 'closeShift',
        input: ({ context }) => ({
          shiftId: context.shiftId,
          actualEndingCash: context.actualEndingCash,
          discrepancyReason: context.discrepancyReason,
        }),
        onDone: {
          target: 'printingZReport',
          actions: 'assignZReportData',
        },
        onError: {
          target: 'readyToClose',
          actions: ['recordError', 'toastError'],
        },
      },
    },

    printingZReport: {
      invoke: {
        id: 'printZReport',
        src: 'printZReport',
        input: ({ context }) => ({
          printRef: context.printRef,
        }),
        onDone: {
          target: 'success',
        },
        onError: {
          target: 'success',
          actions: ['recordError', 'toastError'],
        },
      },
    },

    success: {
      entry: 'triggerLogout',
      on: {
        START: {
          target: 'checkingSyncStatus',
          actions: 'resetContext',
        },
      },
    },

    cancelled: {
      on: {
        START: {
          target: 'checkingSyncStatus',
          actions: 'resetContext',
        },
      },
    },
  },
})
