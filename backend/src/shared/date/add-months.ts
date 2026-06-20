/**
 * Suma meses a una fecha ISO (YYYY-MM-DD) ajustando el desbordamiento de dia.
 *
 * Si el dia origen no existe en el mes destino (ej. 31 de enero + 1 mes), se
 * recorta al ultimo dia del mes destino (28/29 de febrero). Trabaja en UTC para
 * evitar corrimientos por zona horaria.
 * @param isoDate - Fecha base en formato YYYY-MM-DD.
 * @param months - Numero de meses a sumar (entero, puede ser 0).
 * @returns La nueva fecha en formato YYYY-MM-DD.
 */
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const totalMonths = month - 1 + months;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12; // 0-11, siempre positivo
  const lastDayOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDayOfMonth);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${targetYear}-${pad(targetMonth + 1)}-${pad(targetDay)}`;
}

/**
 * Suma dias a una fecha ISO (YYYY-MM-DD), en UTC.
 * @param isoDate - Fecha base en formato YYYY-MM-DD.
 * @param days - Numero de dias a sumar (puede ser negativo).
 * @returns La nueva fecha en formato YYYY-MM-DD.
 */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}`;
}

/**
 * Devuelve la fecha de hoy en formato YYYY-MM-DD (UTC).
 * @returns La fecha actual.
 */
export function today(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
}

/**
 * Calcula el numero de dias entre dos fechas ISO (YYYY-MM-DD), en UTC.
 * @param fromIso - Fecha inicial.
 * @param toIso - Fecha final.
 * @returns Dias de diferencia (toIso - fromIso).
 */
export function daysBetween(fromIso: string, toIso: string): number {
  const [ay, am, ad] = fromIso.split('-').map(Number);
  const [by, bm, bd] = toIso.split('-').map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86400000);
}
