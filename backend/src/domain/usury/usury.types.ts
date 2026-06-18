/**
 * Tipos de la evaluacion de usura.
 *
 * En Colombia la tasa de usura la fija la Superfinanciera por modalidad y
 * vigencia (usura = IBC * 1.5). Cambia periodicamente, por lo que el tope se
 * consulta del catalogo (tabla `usury_rates`) y NUNCA se hardcodea en el
 * dominio. Estas funciones reciben el tope ya resuelto como parametro.
 *
 * Todas las tasas se expresan como fracciones decimales en Efectiva Anual.
 */

/** Resultado de comparar una tasa contra el tope de usura vigente. */
export interface UsuryEvaluation {
  /** Tasa del credito normalizada a Efectiva Anual. */
  readonly effectiveAnnualRate: number;
  /** Tope de usura vigente (E.A.) contra el que se compara. */
  readonly usuryCap: number;
  /** `true` si la tasa supera el tope (credito usurario / ilegal). */
  readonly isUsurious: boolean;
  /**
   * Margen en puntos porcentuales: tope - tasa.
   * Positivo = hay holgura; negativo = excede el tope.
   */
  readonly marginPoints: number;
  /** Porcentaje del tope que consume la tasa (tasa / tope * 100). */
  readonly usagePercentage: number;
}
