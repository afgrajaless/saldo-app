import { roundMoney } from '../shared/money';

/**
 * Entrada para la estimación del extracto de tarjeta de crédito.
 */
export interface EstimateStatementInput {
  /**
   * Cargos nuevos realizados en el ciclo actual.
   */
  chargesInCycle: number;

  /**
   * Cuota de crédito en cuotas (CDT) vencida en este ciclo.
   */
  installmentDueInCycle: number;

  /**
   * Saldo giratorio del ciclo anterior que genera interés.
   */
  revolvingBase: number;

  /**
   * Tasa de interés mensual vencida (ej. 0.02 para 2%).
   */
  monthlyRate: number;

  /**
   * Cuota de manejo en este ciclo.
   */
  managementFeeThisCycle: number;

  /**
   * Porcentaje mínimo del saldo que el usuario debe pagar (ej. 0.05 para 5%).
   */
  minPaymentPct: number;
}

/**
 * Salida de la estimación del extracto.
 */
export interface StatementEstimate {
  /**
   * Saldo total estimado de la tarjeta (suma de cargos, cuota, interés y cuota de manejo).
   */
  estimatedBalance: number;

  /**
   * Pago mínimo recomendado (porcentaje del saldo + interés + cuota de manejo, acotado al saldo).
   */
  estimatedMinPayment: number;
}

/**
 * Estima el extracto de tarjeta de crédito para un ciclo de facturación.
 *
 * Calcula el saldo total esperado sumando cargos nuevos, cuota vencida,
 * intereses sobre el saldo giratorio anterior y cuota de manejo. El pago
 * mínimo es un porcentaje del saldo más los intereses y cuota de manejo,
 * acotado para no exceder el saldo total.
 *
 * @param input - Datos del ciclo de facturación.
 * @returns Saldo estimado y pago mínimo recomendado.
 */
export function estimateStatement(
  input: EstimateStatementInput
): StatementEstimate {
  const {
    chargesInCycle,
    installmentDueInCycle,
    revolvingBase,
    monthlyRate,
    managementFeeThisCycle,
    minPaymentPct,
  } = input;

  // Calcula el interés generado en este ciclo sobre el saldo anterior.
  const interesCiclo = roundMoney(revolvingBase * monthlyRate);

  // Suma todos los componentes del saldo estimado.
  const estimatedBalance = roundMoney(
    chargesInCycle +
      installmentDueInCycle +
      interesCiclo +
      managementFeeThisCycle
  );

  // Calcula el pago mínimo como porcentaje del saldo, más intereses y cuota de manejo.
  const minPaymentBefore = roundMoney(
    minPaymentPct * estimatedBalance + managementFeeThisCycle + interesCiclo
  );

  // Acota el pago mínimo para que no exceda el saldo estimado.
  const estimatedMinPayment = Math.min(minPaymentBefore, estimatedBalance);

  return {
    estimatedBalance,
    estimatedMinPayment: roundMoney(estimatedMinPayment),
  };
}
