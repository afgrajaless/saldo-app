/** Institución financiera disponible en el proveedor de Open Finance. */
export interface OFInstitution {
  id: string;
  name: string;
}

/** Tipo de cuenta de depósito reportada por Open Finance. */
export type OFAccountType = 'savings' | 'checking';

/** Cuenta de depósito (forma canónica Open Finance). */
export interface OFAccount {
  externalId: string;
  name: string;
  type: OFAccountType;
  balance: number;
  currency: string;
}

/** Tipo de producto de crédito reportado por Open Finance. */
export type OFCreditProductType = 'credit_card' | 'loan' | string;

/** Valores válidos del enum debt_type. */
export type DebtType =
  | 'libre_inversion'
  | 'tarjeta_credito'
  | 'libranza'
  | 'hipotecario'
  | 'vehiculo'
  | 'educativo'
  | 'gota_gota';

/** Producto de crédito (forma canónica Open Finance). */
export interface OFCreditProduct {
  externalId: string;
  name: string;
  type: OFCreditProductType;
  balance: number;
  // Tarjeta:
  creditLimit?: number;
  statementDay?: number;
  paymentDay?: number;
  rotativoRateEa?: number;
  // Préstamo:
  effectiveAnnualRate?: number;
  monthlyPayment?: number;
  termMonths?: number;
  loanKind?: string;
}

/** Resultado del inicio de consentimiento. */
export interface OFConsentResult {
  externalConnectionId: string;
  status: 'active' | 'pending';
  consentExpiresAt: string | null;
  redirectUrl?: string;
}

/** Cuenta de activo ya normalizada al modelo de Saldo. */
export interface NormalizedAccount {
  externalId: string;
  name: string;
  balance: number;
}

/** Tarjeta de crédito ya normalizada al modelo de Saldo. */
export interface NormalizedCard {
  externalId: string;
  name: string;
  balance: number;
  creditLimit: number;
  statementDay: number;
  paymentDay: number;
  rotativoRateEa: number;
}

/** Deuda (préstamo) ya normalizada al modelo de Saldo. */
export interface NormalizedDebt {
  externalId: string;
  creditor: string;
  debtType: DebtType;
  balance: number;
  effectiveAnnualRate: number;
  monthlyPayment: number;
  termMonths: number;
}

/** Resultado de normalizar un producto de crédito: tarjeta, deuda u omitido. */
export type NormalizedCreditProduct =
  | { kind: 'card'; card: NormalizedCard }
  | { kind: 'debt'; debt: NormalizedDebt }
  | { kind: 'skipped'; reason: string };
