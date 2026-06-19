/** Rango de un mes: [inicio, inicio del mes siguiente). */
export interface MonthRange {
  /** Primer dia del mes (YYYY-MM-DD). */
  start: string;
  /** Primer dia del mes siguiente, exclusivo (YYYY-MM-DD). */
  nextStart: string;
}

/**
 * Calcula el rango de fechas de un mes a partir de 'YYYY-MM'.
 *
 * Se usa para filtrar transacciones del periodo con `occurredOn >= start AND
 * occurredOn < nextStart`, evitando problemas con el ultimo dia del mes.
 * @param month - Mes en formato YYYY-MM.
 * @returns El rango [inicio, inicio del mes siguiente).
 */
export function monthRange(month: string): MonthRange {
  const [year, monthNumber] = month.split('-').map(Number);
  const pad = (n: number): string => String(n).padStart(2, '0');
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  return {
    start: `${year}-${pad(monthNumber)}-01`,
    nextStart: `${nextYear}-${pad(nextMonth)}-01`,
  };
}

/**
 * Devuelve el mes actual en formato YYYY-MM.
 * @returns El mes actual.
 */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
