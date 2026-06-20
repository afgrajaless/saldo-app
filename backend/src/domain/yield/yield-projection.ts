import { roundMoney } from '../shared/money';

/**
 * Proyeccion de rendimientos para cuentas remuneradas (rendimiento diario
 * compuesto, tasa variable) y CDT (deposito a termino, tasa fija con retencion
 * en la fuente).
 *
 * Las tasas se expresan como fracciones decimales E.A. (0.1125 = 11.25 %).
 * La base de capitalizacion es de 365 dias, consistente con la forma en que
 * los neobancos colombianos liquidan el rendimiento diario sobre el saldo.
 */

/** Dias del anio usados como base de capitalizacion. */
export const DAYS_PER_YEAR = 365;

/**
 * Convierte una tasa Efectiva Anual a su tasa diaria equivalente.
 * @param effectiveAnnual - Tasa E.A. como fraccion decimal (ej. 0.1125).
 * @returns La tasa diaria efectiva.
 */
export function dailyRate(effectiveAnnual: number): number {
  return Math.pow(1 + effectiveAnnual, 1 / DAYS_PER_YEAR) - 1;
}

/**
 * Proyecta el saldo de una cuenta remunerada tras N dias de rendimiento
 * diario compuesto, sin aportes ni retiros.
 * @param principal - Saldo inicial.
 * @param effectiveAnnual - Tasa E.A. como fraccion decimal.
 * @param days - Dias transcurridos.
 * @returns El saldo proyectado, redondeado a centavos.
 */
export function projectSavingsBalance(
  principal: number,
  effectiveAnnual: number,
  days: number,
): number {
  if (days <= 0) return roundMoney(principal);
  return roundMoney(principal * Math.pow(1 + effectiveAnnual, days / DAYS_PER_YEAR));
}

/**
 * Calcula el rendimiento (solo intereses) de una cuenta remunerada en un
 * periodo de N dias.
 * @param principal - Saldo al inicio del periodo.
 * @param effectiveAnnual - Tasa E.A. como fraccion decimal.
 * @param days - Dias del periodo.
 * @returns El interes generado, redondeado a centavos.
 */
export function savingsYield(principal: number, effectiveAnnual: number, days: number): number {
  return roundMoney(projectSavingsBalance(principal, effectiveAnnual, days) - principal);
}

/** Resultado de la proyeccion de un CDT al vencimiento. */
export interface CdtProjection {
  /** Interes bruto generado en todo el plazo. */
  grossInterest: number;
  /** Retencion en la fuente sobre el interes. */
  withholding: number;
  /** Interes neto (bruto - retencion). */
  netInterest: number;
  /** Valor a recibir al vencimiento (capital + interes neto). */
  maturityValue: number;
}

/**
 * Proyecta un CDT al vencimiento: interes bruto compuesto a la tasa E.A. fija,
 * la retencion en la fuente sobre los intereses y el valor neto a recibir.
 * @param principal - Capital invertido.
 * @param effectiveAnnual - Tasa E.A. fija como fraccion decimal.
 * @param termDays - Plazo del CDT en dias.
 * @param withholdingRate - Tasa de retencion en la fuente (ej. 0.04).
 * @returns El desglose del CDT al vencimiento.
 */
export function projectCdt(
  principal: number,
  effectiveAnnual: number,
  termDays: number,
  withholdingRate: number,
): CdtProjection {
  const grossInterest = roundMoney(
    principal * (Math.pow(1 + effectiveAnnual, termDays / DAYS_PER_YEAR) - 1),
  );
  const withholding = roundMoney(grossInterest * withholdingRate);
  const netInterest = roundMoney(grossInterest - withholding);
  const maturityValue = roundMoney(principal + netInterest);
  return { grossInterest, withholding, netInterest, maturityValue };
}

/** Un punto del cronograma de devengo (valor acumulado en una fecha). */
export interface AccrualPoint {
  /** Dias transcurridos desde el inicio. */
  day: number;
  /** Valor proyectado de la inversion en ese dia (capital + interes acumulado). */
  value: number;
  /** Interes acumulado bruto hasta ese dia. */
  accruedInterest: number;
}

/**
 * Genera un cronograma de devengo punto por punto para alimentar graficos de
 * crecimiento. Reparte el plazo en `steps` tramos iguales (compuesto diario).
 * @param principal - Capital o saldo inicial.
 * @param effectiveAnnual - Tasa E.A. como fraccion decimal.
 * @param totalDays - Dias totales a proyectar.
 * @param steps - Cantidad de puntos intermedios (ej. 12 para un anio mensual).
 * @returns Lista de puntos { day, value, accruedInterest }.
 */
export function accrualSchedule(
  principal: number,
  effectiveAnnual: number,
  totalDays: number,
  steps: number,
): AccrualPoint[] {
  if (steps <= 0 || totalDays <= 0) return [];
  const points: AccrualPoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const day = Math.round((totalDays * i) / steps);
    const value = projectSavingsBalance(principal, effectiveAnnual, day);
    points.push({ day, value, accruedInterest: roundMoney(value - principal) });
  }
  return points;
}
