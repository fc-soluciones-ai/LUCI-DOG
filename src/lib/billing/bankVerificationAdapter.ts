// Punto de extensión para verificación automática de pagos (SINPE/transferencia).
// No hay credenciales de ningún banco configuradas todavía, así que el único
// adaptador real disponible es manual — cuando exista una integración real,
// se agrega otra clase que implemente esta misma interfaz.

export interface BankVerificationResult {
  verified: boolean
  detail?: string
}

export interface BankVerificationAdapter {
  verifyReference(reference: string, amount: number): Promise<BankVerificationResult>
}

export class ManualBankVerificationAdapter implements BankVerificationAdapter {
  async verifyReference(): Promise<BankVerificationResult> {
    return { verified: false, detail: 'Sin integración bancaria configurada — requiere revisión manual del comprobante.' }
  }
}

export function getBankVerificationAdapter(): BankVerificationAdapter {
  return new ManualBankVerificationAdapter()
}
