import {
  NormalizedAccount,
  NormalizedCreditProduct,
  OFAccount,
  OFCreditProduct,
} from './types';

/** Valores válidos del enum debt_type en la BD. */
const KNOWN_DEBT_TYPES = new Set([
  'libre_inversion',
  'tarjeta_credito',
  'libranza',
  'hipotecario',
  'vehiculo',
  'educativo',
  'gota_gota',
]);

/**
 * Mapea el tipo de préstamo de OF al enum debt_type; cae a 'libre_inversion'.
 * @param loanKind - Tipo de préstamo según el banco (puede venir indefinido).
 * @returns Un valor válido del enum debt_type.
 */
export function mapLoanKindToDebtType(loanKind: string | undefined): string {
  if (loanKind && KNOWN_DEBT_TYPES.has(loanKind)) {
    return loanKind;
  }
  return 'libre_inversion';
}

/**
 * Normaliza una cuenta de depósito OF al modelo de Saldo.
 * @param of - Cuenta en forma canónica OF.
 * @returns Cuenta normalizada (externalId, name, balance).
 */
export function normalizeAccount(of: OFAccount): NormalizedAccount {
  return { externalId: of.externalId, name: of.name, balance: of.balance };
}

/**
 * Normaliza un producto de crédito OF a tarjeta, deuda u 'skipped'.
 * @param of - Producto en forma canónica OF.
 * @returns Tarjeta normalizada, deuda normalizada, u omitido con razón.
 */
export function normalizeCreditProduct(of: OFCreditProduct): NormalizedCreditProduct {
  if (of.type === 'credit_card') {
    if (
      of.creditLimit == null ||
      of.statementDay == null ||
      of.paymentDay == null ||
      of.rotativoRateEa == null
    ) {
      return { kind: 'skipped', reason: `tarjeta sin datos mínimos: ${of.externalId}` };
    }
    return {
      kind: 'card',
      card: {
        externalId: of.externalId,
        name: of.name,
        balance: of.balance,
        creditLimit: of.creditLimit,
        statementDay: of.statementDay,
        paymentDay: of.paymentDay,
        rotativoRateEa: of.rotativoRateEa,
      },
    };
  }

  if (of.type === 'loan') {
    return {
      kind: 'debt',
      debt: {
        externalId: of.externalId,
        creditor: of.name,
        debtType: mapLoanKindToDebtType(of.loanKind),
        balance: of.balance,
        effectiveAnnualRate: of.effectiveAnnualRate ?? 0,
        monthlyPayment: of.monthlyPayment ?? 0,
        termMonths: of.termMonths ?? 0,
      },
    };
  }

  return { kind: 'skipped', reason: `tipo de producto no soportado: ${of.type}` };
}
