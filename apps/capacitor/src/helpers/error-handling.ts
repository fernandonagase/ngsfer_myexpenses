/**
 * Mensagem que o usuário vê. Quando o erro embrulha outro (`cause`), a mensagem que interessa é a
 * de origem: as stores lançam `Error('Falha ao ...', { cause: result })`, e sem isto a legenda da
 * notificação repete o título genérico em vez de dizer o que o banco recusou.
 */
function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return String(error)

  const causeMessage = getCauseMessage(error.cause)
  return causeMessage ?? error.message
}

function getCauseMessage(cause: unknown) {
  if (cause instanceof Error) return cause.message || null
  if (typeof cause !== 'object' || cause === null || !('message' in cause)) return null

  const message = (cause as { message: unknown }).message
  return typeof message === 'string' && message.length > 0 ? message : null
}

export { getErrorMessage }
