/**
 * Classifica um conjunto de itens com `valueInCents` em saídas (soma dos
 * negativos) e entradas (soma dos positivos) agendadas. Valor zero não conta
 * para nenhum dos dois lados.
 */
export function sumBySign(
  items: Array<{ valueInCents: number }>,
): { outflowsInCents: number; inflowsInCents: number } {
  let outflowsInCents = 0
  let inflowsInCents = 0
  for (const item of items) {
    if (item.valueInCents < 0) {
      outflowsInCents += item.valueInCents
    } else if (item.valueInCents > 0) {
      inflowsInCents += item.valueInCents
    }
  }
  return { outflowsInCents, inflowsInCents }
}
