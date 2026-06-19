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
