import { normalizeToEffectiveAnnual } from '../rates/rate-conversion';
import { RateType } from '../rates/rate-type';
import { UsuryEvaluation } from './usury.types';

/** Factor legal que define la tasa de usura a partir del IBC (usura = IBC * 1.5). */
export const USURY_FACTOR = 1.5;

/**
 * Calcula la tasa de usura a partir del Interes Bancario Corriente (IBC).
 *
 * Formula legal colombiana: usura = IBC * 1.5. Ambas tasas en Efectiva Anual.
 * @param ibcEffectiveAnnual - IBC vigente de la modalidad, en E.A. (fraccion).
 * @returns El tope de usura en E.A.
 */
export function calculateUsuryCap(ibcEffectiveAnnual: number): number {
  if (ibcEffectiveAnnual < 0) {
    throw new Error('El IBC no puede ser negativo.');
  }
  return ibcEffectiveAnnual * USURY_FACTOR;
}

/**
 * Evalua una tasa Efectiva Anual contra el tope de usura vigente.
 *
 * La tasa se considera usuraria solo si supera estrictamente el tope: una tasa
 * igual al tope es legal.
 * @param effectiveAnnualRate - Tasa del credito en E.A. (fraccion decimal).
 * @param usuryCap - Tope de usura vigente en E.A. (resuelto del catalogo).
 * @returns El detalle de la evaluacion.
 */
export function evaluateUsury(
  effectiveAnnualRate: number,
  usuryCap: number,
): UsuryEvaluation {
  if (usuryCap <= 0) {
    throw new Error('El tope de usura debe ser mayor que cero.');
  }
  return {
    effectiveAnnualRate,
    usuryCap,
    isUsurious: effectiveAnnualRate > usuryCap,
    marginPoints: usuryCap - effectiveAnnualRate,
    usagePercentage: (effectiveAnnualRate / usuryCap) * 100,
  };
}

/**
 * Evalua una tasa en cualquier representacion contra el tope de usura.
 *
 * Normaliza primero la tasa a Efectiva Anual (la comparable) y luego delega en
 * `evaluateUsury`.
 * @param rate - Valor de la tasa del credito como fraccion decimal.
 * @param type - Representacion de la tasa (E.A., M.V. o N.M.V.).
 * @param usuryCap - Tope de usura vigente en E.A. (resuelto del catalogo).
 * @returns El detalle de la evaluacion.
 */
export function evaluateUsuryFromRate(
  rate: number,
  type: RateType,
  usuryCap: number,
): UsuryEvaluation {
  const effectiveAnnualRate = normalizeToEffectiveAnnual(rate, type);
  return evaluateUsury(effectiveAnnualRate, usuryCap);
}
