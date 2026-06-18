import { MONTHS_PER_YEAR, RateType } from './rate-type';

/**
 * Conversion de tasas de interes entre las representaciones del dominio
 * colombiano: Efectiva Anual (E.A.), Mensual Vencida (M.V.) y Nominal Mes
 * Vencido (N.M.V.).
 *
 * Formulas base:
 *   E.A.  = (1 + i_mensual)^12 - 1
 *   i_mensual = (1 + E.A.)^(1/12) - 1
 *   N.M.V. = i_mensual * 12
 *
 * Las tasas se expresan como fracciones decimales (0.24 = 24 %).
 */

/**
 * Convierte una tasa Efectiva Anual a Mensual Vencida.
 * @param effectiveAnnual - Tasa E.A. como fraccion decimal (ej. 0.24).
 * @returns La tasa mensual efectiva equivalente.
 */
export function effectiveAnnualToMonthly(effectiveAnnual: number): number {
  return Math.pow(1 + effectiveAnnual, 1 / MONTHS_PER_YEAR) - 1;
}

/**
 * Convierte una tasa Mensual Vencida a Efectiva Anual.
 * @param monthly - Tasa mensual efectiva como fraccion decimal (ej. 0.02).
 * @returns La tasa E.A. equivalente.
 */
export function monthlyToEffectiveAnnual(monthly: number): number {
  return Math.pow(1 + monthly, MONTHS_PER_YEAR) - 1;
}

/**
 * Convierte una tasa Nominal Mes Vencido (anual) a Mensual Vencida.
 * @param nominalAnnual - Tasa N.M.V. anual como fraccion decimal (ej. 0.24).
 * @returns La tasa mensual efectiva equivalente.
 */
export function nominalAnnualToMonthly(nominalAnnual: number): number {
  return nominalAnnual / MONTHS_PER_YEAR;
}

/**
 * Convierte una tasa Mensual Vencida a Nominal Mes Vencido (anual).
 * @param monthly - Tasa mensual efectiva como fraccion decimal (ej. 0.02).
 * @returns La tasa N.M.V. anual equivalente.
 */
export function monthlyToNominalAnnual(monthly: number): number {
  return monthly * MONTHS_PER_YEAR;
}

/**
 * Normaliza cualquier representacion de tasa a Efectiva Anual.
 *
 * Se usa para comparar contra la tasa de usura, que siempre se evalua en E.A.
 * @param rate - Valor de la tasa como fraccion decimal.
 * @param type - Representacion de la tasa de entrada.
 * @returns La tasa E.A. equivalente.
 */
export function normalizeToEffectiveAnnual(rate: number, type: RateType): number {
  switch (type) {
    case RateType.EFFECTIVE_ANNUAL:
      return rate;
    case RateType.MONTHLY_EFFECTIVE:
      return monthlyToEffectiveAnnual(rate);
    case RateType.NOMINAL_ANNUAL:
      return monthlyToEffectiveAnnual(nominalAnnualToMonthly(rate));
    default: {
      const exhaustiveCheck: never = type;
      throw new Error(`Tipo de tasa no soportado: ${String(exhaustiveCheck)}`);
    }
  }
}

/**
 * Normaliza cualquier representacion de tasa a Mensual Vencida.
 *
 * Se usa para alimentar el motor de amortizacion, que opera con la tasa mensual.
 * @param rate - Valor de la tasa como fraccion decimal.
 * @param type - Representacion de la tasa de entrada.
 * @returns La tasa mensual efectiva equivalente.
 */
export function normalizeToMonthly(rate: number, type: RateType): number {
  switch (type) {
    case RateType.EFFECTIVE_ANNUAL:
      return effectiveAnnualToMonthly(rate);
    case RateType.MONTHLY_EFFECTIVE:
      return rate;
    case RateType.NOMINAL_ANNUAL:
      return nominalAnnualToMonthly(rate);
    default: {
      const exhaustiveCheck: never = type;
      throw new Error(`Tipo de tasa no soportado: ${String(exhaustiveCheck)}`);
    }
  }
}
