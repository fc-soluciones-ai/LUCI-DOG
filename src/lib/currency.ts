const formatter = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
})

/** Formatea un monto en colones costarricenses (₡), moneda estándar de toda la app. */
export function formatCRC(amount: number | string | { toString(): string }): string {
  return formatter.format(Number(amount.toString()))
}
