import { addMonths, daysBetween } from '../../shared/date/add-months';
import { roundMoney } from '../shared/money';

/**
 * Modo de causacion del interes de un periodo.
 * - 'monthly': interes = saldo * tasa_mensual (mes contable de 30 dias).
 * - 'daily':   interes = saldo * ((1 + tasa_mensual)^(12*dias/365) - 1), donde
 *              `dias` son los dias reales entre fechas de cuota. Mas fiel a la
 *              liquidacion bancaria por dias.
 */
export type InterestMode = 'monthly' | 'daily';

/**
 * Causa el interes de un periodo segun el modo.
 *
 * En modo diario se cuentan los dias reales entre la cuota anterior y la actual
 * (anclados a `anchorDate`, la fecha de la cuota 0 del cronograma).
 * @param balance - Saldo de capital al inicio del periodo.
 * @param monthlyRate - Tasa mensual efectiva como fraccion decimal.
 * @param mode - Modo de causacion ('monthly' | 'daily').
 * @param anchorDate - Fecha base del cronograma (YYYY-MM-DD); requerida si daily.
 * @param period - Numero de periodo (1-based) dentro de este cronograma.
 * @returns El interes del periodo, redondeado a centavos.
 */
export function accruePeriodInterest(
  balance: number,
  monthlyRate: number,
  mode: InterestMode,
  anchorDate: string | undefined,
  period: number,
): number {
  if (mode === 'daily' && anchorDate) {
    const days = daysBetween(addMonths(anchorDate, period - 1), addMonths(anchorDate, period));
    const factor = Math.pow(1 + monthlyRate, (12 * days) / 365) - 1;
    return roundMoney(balance * factor);
  }
  return roundMoney(balance * monthlyRate);
}
