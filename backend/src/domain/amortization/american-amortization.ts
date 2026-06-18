import { roundMoney } from '../shared/money';
import {
  AmortizationInput,
  AmortizationSchedule,
  InstallmentRow,
} from './amortization.types';
import { validateAmortizationInput } from './amortization.validation';

/**
 * Motor de amortizacion por sistema americano (bullet / interes periodico).
 *
 * En el sistema americano solo se pagan intereses durante el plazo y el capital
 * completo se abona en la ultima cuota. El saldo permanece constante hasta el
 * final, por lo que el interes periodico es el mismo en cada cuota.
 */

/**
 * Genera el cronograma de amortizacion completo por sistema americano.
 *
 * Cuotas 1..n-1: solo interes (capital = 0). Cuota n: interes + capital total.
 * @param input - Capital, tasa mensual y numero de cuotas.
 * @returns El cronograma con sus filas y totales agregados.
 */
export function generateAmericanSchedule(
  input: AmortizationInput,
): AmortizationSchedule {
  validateAmortizationInput(input);
  const { principal, monthlyRate, numberOfInstallments: n } = input;

  const periodicInterest = roundMoney(principal * monthlyRate);
  const rows: InstallmentRow[] = [];

  for (let period = 1; period <= n; period += 1) {
    const isLast = period === n;
    const principalPaid = isLast ? principal : 0;
    const payment = roundMoney(periodicInterest + principalPaid);
    const balance = isLast ? 0 : principal;
    rows.push({
      number: period,
      payment,
      interest: periodicInterest,
      principal: principalPaid,
      balance,
    });
  }

  return {
    rows,
    totalInterest: roundMoney(rows.reduce((sum, r) => sum + r.interest, 0)),
    totalPaid: roundMoney(rows.reduce((sum, r) => sum + r.payment, 0)),
  };
}
