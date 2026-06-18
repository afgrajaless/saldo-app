/**
 * Tipos del motor de amortizacion.
 *
 * El cronograma se almacena (no se recalcula al vuelo) para soportar abonos a
 * capital y dar trazabilidad. Todos los montos estan redondeados a centavos.
 */

/** Parametros de entrada para generar un cronograma de amortizacion. */
export interface AmortizationInput {
  /** Capital prestado (monto principal). Debe ser mayor que cero. */
  readonly principal: number;
  /** Tasa mensual efectiva como fraccion decimal (ej. 0.02 = 2 % M.V.). */
  readonly monthlyRate: number;
  /** Numero total de cuotas. Debe ser un entero mayor que cero. */
  readonly numberOfInstallments: number;
}

/** Una cuota del cronograma con su desglose capital/interes y saldo restante. */
export interface InstallmentRow {
  /** Numero de cuota, empezando en 1. */
  readonly number: number;
  /** Valor total de la cuota (capital + interes). */
  readonly payment: number;
  /** Porcion de interes de la cuota. */
  readonly interest: number;
  /** Porcion de capital (abono) de la cuota. */
  readonly principal: number;
  /** Saldo de capital pendiente despues de pagar esta cuota. */
  readonly balance: number;
}

/** Cronograma completo de amortizacion con totales agregados. */
export interface AmortizationSchedule {
  /** Cuota fija periodica (antes de ajustes de redondeo en la ultima cuota). */
  readonly fixedPayment: number;
  /** Filas del cronograma, una por cuota. */
  readonly rows: readonly InstallmentRow[];
  /** Suma total de intereses pagados a lo largo del credito. */
  readonly totalInterest: number;
  /** Suma total pagada (capital + intereses). */
  readonly totalPaid: number;
}
