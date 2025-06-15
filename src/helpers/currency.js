import currency from 'currency.js'

const BRL = (value) => currency(value, { symbol: 'R$ ', separator: '.', decimal: ',' })

export { BRL }
