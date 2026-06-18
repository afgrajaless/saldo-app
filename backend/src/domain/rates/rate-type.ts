/**
 * Representaciones de tasa de interes usadas en el dominio financiero colombiano.
 *
 * - EFFECTIVE_ANNUAL  (E.A.):  Efectiva Anual. Es la comparable; se evalua
 *                              contra la tasa de usura.
 * - MONTHLY_EFFECTIVE (M.V.):  Mensual Vencida. Entra al calculo de la cuota.
 * - NOMINAL_ANNUAL    (N.M.V.): Nominal Mes Vencido. Se divide entre 12 para
 *                              obtener la mensual.
 *
 * Todas las tasas se manejan como fracciones decimales: 0.24 equivale a 24 %.
 */
export enum RateType {
  EFFECTIVE_ANNUAL = 'EFFECTIVE_ANNUAL',
  MONTHLY_EFFECTIVE = 'MONTHLY_EFFECTIVE',
  NOMINAL_ANNUAL = 'NOMINAL_ANNUAL',
}

/** Numero de periodos mensuales en un anio. */
export const MONTHS_PER_YEAR = 12;
