import { AmortizationSchedule } from './amortization.types';

/**
 * Modalidad de aplicacion de un abono a capital (Ley 1555 de 2012, prepago sin
 * sancion). El deudor elige como se recalcula el credito.
 */
export enum PrepaymentMode {
  /** Conserva la cuota y reduce el numero de cuotas restantes. */
  REDUCE_TERM = 'REDUCE_TERM',
  /** Conserva el plazo y reduce el valor de la cuota. */
  REDUCE_INSTALLMENT = 'REDUCE_INSTALLMENT',
}

/** Parametros para recalcular un credito frances tras un abono a capital. */
export interface PrepaymentInput {
  /** Saldo de capital pendiente justo antes del abono. */
  readonly currentBalance: number;
  /** Tasa mensual efectiva como fraccion decimal (ej. 0.02 = 2 % M.V.). */
  readonly monthlyRate: number;
  /** Numero de cuotas que quedaban antes del abono. */
  readonly remainingInstallments: number;
  /** Monto del abono extraordinario a capital. */
  readonly extraPayment: number;
  /** Modalidad elegida: reducir plazo o reducir cuota. */
  readonly mode: PrepaymentMode;
}

/** Resultado del recalculo tras aplicar un abono a capital. */
export interface PrepaymentResult {
  /** Modalidad aplicada. */
  readonly mode: PrepaymentMode;
  /** Abono efectivamente aplicado (acotado al saldo pendiente). */
  readonly appliedExtraPayment: number;
  /** Saldo de capital tras el abono, antes de proyectar las nuevas cuotas. */
  readonly newBalance: number;
  /** `true` si el abono cancela por completo la obligacion. */
  readonly isPaidOff: boolean;
  /** Cronograma proyectado de las cuotas restantes tras el abono. */
  readonly schedule: AmortizationSchedule;
  /** Intereses ahorrados frente a continuar el cronograma original. */
  readonly interestSaved: number;
}
