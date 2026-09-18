import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// invoice-store.ts importa o datasource TypeORM real, o `ConfirmSheetDialog.vue` (SFC que este
// ambiente de teste node não parseia) e a operation-store inteira (que arrasta ainda mais
// componentes .vue via `$q.dialog`). Isolamos aqui só o que o teste cobre: depois que
// `reopenInvoiceForEditing` salva a fatura reaberta, ela precisa invalidar o cache de operações
// da operation-store — sem isso, uma compra já aberta na tela continua presa em
// `isLockedByInvoice` (regressão WOR-106).
const { saveMock } = vi.hoisted(() => ({ saveMock: vi.fn() }))
const { refreshScreenMock } = vi.hoisted(() => ({ refreshScreenMock: vi.fn() }))

vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify: vi.fn(),
    dialog: () => ({
      onOk: (callback: () => void) => {
        callback()
        return { onCancel: () => {} }
      },
    }),
  }),
}))

vi.mock('src/components/ConfirmSheetDialog.vue', () => ({ default: {} }))

vi.mock('src/databases/datasources/ExpensesDatasource', () => ({
  default: {
    dataSource: {
      getRepository: () => ({ save: saveMock, find: vi.fn(), findOne: vi.fn() }),
      manager: {},
    },
  },
}))

vi.mock('src/databases/entities/expenses/card-invoice-helpers', () => ({
  ensureSuccessorOpenInvoice: vi.fn(),
  reconcileInvoiceStatuses: vi.fn(),
}))

vi.mock('src/stores/operation-store', () => ({
  useOperationStore: () => ({ refreshScreen: refreshScreenMock }),
}))

import { useInvoiceStore } from './invoice-store'
import { InvoiceStatus } from 'src/databases/entities/expenses/card-invoice'

beforeEach(() => {
  setActivePinia(createPinia())
  saveMock.mockReset()
  refreshScreenMock.mockReset()
})

describe('useInvoiceStore.reopenInvoiceForEditing', () => {
  it('recarrega a operation-store depois de salvar a fatura reaberta', async () => {
    saveMock.mockResolvedValue(undefined)
    const invoice = { id: 1, status: InvoiceStatus.FECHADA } as unknown as Parameters<
      ReturnType<typeof useInvoiceStore>['reopenInvoiceForEditing']
    >[0]

    useInvoiceStore().reopenInvoiceForEditing(invoice)

    await vi.waitFor(() => {
      expect(saveMock).toHaveBeenCalledTimes(1)
      expect(refreshScreenMock).toHaveBeenCalledTimes(1)
    })
  })

  it('não reabre nem recarrega quando a fatura já está paga', () => {
    const invoice = { id: 1, status: InvoiceStatus.PAGA } as unknown as Parameters<
      ReturnType<typeof useInvoiceStore>['reopenInvoiceForEditing']
    >[0]

    useInvoiceStore().reopenInvoiceForEditing(invoice)

    expect(saveMock).not.toHaveBeenCalled()
    expect(refreshScreenMock).not.toHaveBeenCalled()
  })
})
