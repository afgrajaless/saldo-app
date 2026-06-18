/**
 * Utilidades para aritmetica monetaria.
 *
 * El dinero se modela en centavos de redondeo (2 decimales) para evitar el
 * drift de punto flotante. El motor de amortizacion redondea cada cuota a
 * centavos y reconcilia el residuo en la ultima cuota, de modo que el saldo
 * cierra exactamente en cero.
 */

/**
 * Redondea un valor monetario a 2 decimales (centavos) con redondeo half-up.
 * @param value - Valor a redondear (puede arrastrar error de punto flotante).
 * @returns El valor redondeado a 2 decimales.
 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Indica si dos valores monetarios son iguales a nivel de centavo.
 * @param a - Primer valor.
 * @param b - Segundo valor.
 * @returns `true` si difieren en menos de medio centavo.
 */
export function moneyEquals(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}
