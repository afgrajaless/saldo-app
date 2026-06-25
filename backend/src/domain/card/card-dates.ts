/** Último día de un mes (1-12) en un año dado. */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Construye 'YYYY-MM-DD' ajustando el día al último del mes si excede. */
function dateInMonth(year: number, month: number, day: number): string {
  const d = Math.min(day, lastDayOfMonth(year, month));
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${d
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Calcula la fecha de corte y la fecha límite de pago de un ciclo.
 * @param statementDay - Día de corte (1-31).
 * @param paymentDay - Día de pago (1-31).
 * @param referenceMonth - Mes del corte en formato YYYY-MM.
 * @returns Fechas de corte y de pago en YYYY-MM-DD.
 */
export function computeCycleDates(
  statementDay: number,
  paymentDay: number,
  referenceMonth: string,
): { cutoffDate: string; paymentDueDate: string } {
  const [y, m] = referenceMonth.split('-').map(Number);
  const cutoffDate = dateInMonth(y, m, statementDay);
  // El pago es del mismo mes solo si su dia es estrictamente posterior al corte.
  let py = y;
  let pm = m;
  if (paymentDay <= statementDay) {
    pm = m + 1;
    if (pm > 12) { pm = 1; py = y + 1; }
  }
  const paymentDueDate = dateInMonth(py, pm, paymentDay);
  return { cutoffDate, paymentDueDate };
}
