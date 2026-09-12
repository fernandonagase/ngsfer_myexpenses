/**
 * Ícone Material para uma categoria, inferido pelo nome (as categorias não têm
 * ícone persistido). Casamento por palavra-chave sem acento; fallback `label`.
 */
const KEYWORDS: Array<[RegExp, string]> = [
  [/mercado|supermercado|feira/, 'shopping_cart'],
  [/alimenta|restaurante|comida|lanche|ifood|padaria/, 'restaurant'],
  [/transporte|uber|onibus|taxi|passagem/, 'directions_car'],
  [/combust|gasolina|posto/, 'local_gas_station'],
  [/moradia|casa|condominio/, 'home'],
  [/aluguel/, 'vpn_key'],
  [/agua/, 'water_drop'],
  [/luz|energia|eletric/, 'bolt'],
  [/internet|wifi/, 'wifi'],
  [/telefone|celular/, 'smartphone'],
  [/assinatura|streaming|netflix|spotify/, 'subscriptions'],
  [/cart(a|ã)o|fatura|credito/, 'credit_card'],
  [/saude|medic|consulta|plano/, 'favorite'],
  [/farmacia|remedio/, 'medication'],
  [/academia|esporte|gym/, 'fitness_center'],
  [/educa|escola|curso|faculdade|livro/, 'school'],
  [/roupa|vestuario/, 'checkroom'],
  [/beleza|cabelo|salao|barbe/, 'content_cut'],
  [/pet|animal|cachorro|gato/, 'pets'],
  [/lazer|diversao|cinema|jogo/, 'sports_esports'],
  [/viagem|hotel|voo/, 'flight'],
  [/presente/, 'redeem'],
  [/imposto|taxa|tributo|governo/, 'account_balance'],
  [/salario|trabalho|emprego|holerite/, 'work'],
  [/adiantamento|vale/, 'schedule'],
  [/freela|servico|projeto/, 'laptop_mac'],
  [/venda/, 'sell'],
  [/investimento|rendimento|dividendo|juros/, 'trending_up'],
  [/reembolso|estorno|devolu/, 'undo'],
  [/transfer|pix/, 'swap_horiz'],
  [/outros|outra|geral|padr(a|ã)o|diversos/, 'more_horiz'],
]

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function categoryIcon(name: string | undefined | null): string {
  if (!name) return 'label'
  const key = normalize(name)
  for (const [pattern, icon] of KEYWORDS) {
    if (pattern.test(key)) return icon
  }
  return 'label'
}
