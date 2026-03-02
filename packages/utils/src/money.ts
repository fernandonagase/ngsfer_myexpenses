function splitInInstallments(totalInCents: number, count: number): number[] {
  if (!Number.isInteger(totalInCents)) {
    throw new Error("totalInCents deve ser inteiro (em centavos)");
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("count deve ser inteiro >= 1");
  }

  const sign = totalInCents < 0 ? -1 : 1;
  const absTotal = Math.abs(totalInCents);

  const base = Math.floor(absTotal / count);
  const remainder = absTotal % count;

  return Array.from({ length: count }, (_, i) => {
    const isLastInstallments = i >= count - remainder;
    const installment = base + (isLastInstallments ? 1 : 0);
    return installment * sign;
  });
}

export { splitInInstallments };
