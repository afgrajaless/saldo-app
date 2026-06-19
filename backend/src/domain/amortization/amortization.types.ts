import { InsuranceConfig } from '../insurance/insurance';
import { InterestMode } from '../interest/interest-accrual';

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
  /** Configuracion del seguro de vida deudor (opcional; por defecto, sin seguro). */
  readonly insurance?: InsuranceConfig;
  /** Modo de causacion del interes (opcional; por defecto, mensual). */
  readonly interestMode?: InterestMode;
  /** Fecha ancla del cronograma (YYYY-MM-DD); requerida para interes diario. */
  readonly anchorDate?: string;
}

/** Una cuota del cronograma con su desglose y saldo restante. */
export interface InstallmentRow {
  /** Numero de cuota, empezando en 1. */
  readonly number: number;
  /** Cuota de amortizacion (capital + interes), sin incluir el seguro. */
  readonly payment: number;
  /** Porcion de interes de la cuota. */
  readonly interest: number;
  /** Porcion de capital (abono) de la cuota. */
  readonly principal: number;
  /** Valor del seguro del periodo (0 si la deuda no tiene seguro). */
  readonly insurance: number;
  /** Saldo de capital pendiente despues de pagar esta cuota. */
  readonly balance: number;
}

/** Cronograma completo de amortizacion con totales agregados. */
export interface AmortizationSchedule {
  /**
   * Cuota fija periodica (capital + interes), solo aplica al sistema frances.
   * En aleman y americano la cuota varia, por lo que este campo queda indefinido.
   */
  readonly fixedPayment?: number;
  /** Filas del cronograma, una por cuota. */
  readonly rows: readonly InstallmentRow[];
  /** Suma total de intereses pagados a lo largo del credito. */
  readonly totalInterest: number;
  /** Suma total del seguro a lo largo del credito. */
  readonly totalInsurance: number;
  /** Suma total pagada en amortizacion (capital + intereses), sin seguro. */
  readonly totalPaid: number;
}
