import { roundMoney } from '../shared/money';

/**
 * Modalidad del seguro de vida deudor que se suma a la cuota.
 * - NONE:  sin seguro.
 * - RATE:  el seguro es una tasa mensual aplicada al saldo (decrece con la deuda).
 * - FIXED: el seguro es un monto fijo mensual.
 */
export enum InsuranceMode {
  NONE = 'none',
  RATE = 'rate',
  FIXED = 'fixed',
}

/** Configuracion del seguro de una deuda. */
export interface InsuranceConfig {
  readonly mode: InsuranceMode;
  /** Tasa mensual (fraccion) si es RATE; monto fijo si es FIXED; ignorado si NONE. */
  readonly value: number;
}

/** Configuracion por defecto: sin seguro. */
export const NO_INSURANCE: InsuranceConfig = { mode: InsuranceMode.NONE, value: 0 };

/**
 * Calcula el valor del seguro de un periodo segun la modalidad.
 *
 * El seguro es aditivo a la cuota: no modifica la amortizacion de capital ni el
 * interes, solo incrementa el valor a pagar.
 * @param config - Configuracion del seguro.
 * @param balanceBefore - Saldo de capital al inicio del periodo (para la tasa).
 * @returns El valor del seguro del periodo, redondeado a centavos.
 */
export function computeInsurance(config: InsuranceConfig, balanceBefore: number): number {
  switch (config.mode) {
    case InsuranceMode.NONE:
      return 0;
    case InsuranceMode.RATE:
      return roundMoney(balanceBefore * config.value);
    case InsuranceMode.FIXED:
      return roundMoney(config.value);
    default: {
      const exhaustiveCheck: never = config.mode;
      throw new Error(`Modalidad de seguro no soportada: ${String(exhaustiveCheck)}`);
    }
  }
}
