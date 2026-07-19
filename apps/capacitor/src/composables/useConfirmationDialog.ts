import { useQuasar } from 'quasar'

export function useConfirmationDialog() {
  const $q = useQuasar()

  function confirmAction({
    label,
    okCallback,
    cancelCallback,
  }: {
    label: string
    okCallback: () => void
    cancelCallback?: () => void
  }) {
    $q.dialog({
      title: 'Confirmar operação',
      message: label,
      ok: true,
      cancel: true,
    })
      .onOk(okCallback)
      .onCancel(() => {
        if (cancelCallback) {
          cancelCallback()
        }
      })
  }

  return { confirmAction }
}
