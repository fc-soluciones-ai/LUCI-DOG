const formatters = new Map<string, Intl.NumberFormat>()

function getFormatter(currencyCode: string): Intl.NumberFormat {
  let formatter = formatters.get(currencyCode)
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    })
    formatters.set(currencyCode, formatter)
  }
  return formatter
}

/** Formatea un monto en la moneda indicada (ISO 4217, ej. la configurada en Marca/White Label). */
export function formatCurrency(amount: number | string | { toString(): string }, currencyCode: string): string {
  return getFormatter(currencyCode).format(Number(amount.toString()))
}

/** Wrapper de compatibilidad: colones costarricenses, moneda por defecto histórica de la app. */
export function formatCRC(amount: number | string | { toString(): string }): string {
  return formatCurrency(amount, 'CRC')
}
