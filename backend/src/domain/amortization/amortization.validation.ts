import { AmortizationInput } from './amortization.types';

/**
 * Valida los parametros de entrada comunes a todos los sistemas de amortizacion.
 * @param input - Capital, tasa mensual y numero de cuotas.
 * @throws Error si el capital, la tasa o el numero de cuotas son invalidos.
 */
export function validateAmortizationInput(input: AmortizationInput): void {
  const { principal, monthlyRate, numberOfInstallments } = input;
  if (principal <= 0) {
    throw new Error('El capital (principal) debe ser mayor que cero.');
  }
  if (monthlyRate < 0) {
    throw new Error('La tasa mensual no puede ser negativa.');
  }
  if (!Number.isInteger(numberOfInstallments) || numberOfInstallments <= 0) {
    throw new Error('El numero de cuotas debe ser un entero mayor que cero.');
  }
}
