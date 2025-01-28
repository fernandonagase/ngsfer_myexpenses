type CentroFinanceiro = {
  id: number
  nome: string
}

type OperacaoFinanceira = {
  id: number
  description: string
  valueInCents: number
  date: string
  centro_financeiro_id: number
}

export type { CentroFinanceiro, OperacaoFinanceira }
