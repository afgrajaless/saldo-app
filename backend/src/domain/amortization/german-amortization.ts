import { computeInsurance, NO_INSURANCE } from '../insurance/insurance';
import { accruePeriodInterest } from '../interest/interest-accrual';
import { roundMoney } from '../shared/money';
import {
  AmortizationInput,
  AmortizationSchedule,
  InstallmentRow,
} from './amortization.types';
import { validateAmortizationInput } from './amortization.validation';

/**
 * Motor de amortizacion por sistema aleman (abono a capital constante).
 *
 * En el sistema aleman el abono a capital es el mismo en cada cuota (P / n) y
 * el interes se calcula sobre el saldo, que decrece de forma lineal. Resultado:
 * la cuota total es decreciente (alta al inicio, baja al final).
 *
 * El seguro (si lo hay) se suma a la cuota sin alterar la amortizacion.
 */

/**
 * Construye una fila del cronograma aleman para un periodo dado.
 * @param number - Numero de cuota (empieza en 1).
 * @param principalPaid - Abono a capital del periodo.
 * @param interest - Interes del periodo.
 * @param balanceBefore - Saldo de capital antes del pago.
 * @param insurance - Valor del seguro del periodo.
 * @returns La fila con su desglose y el saldo resultante.
 */
function buildRow(
  number: number,
  principalPaid: number,
  interest: number,
  balanceBefore: number,
  insurance: number,
): InstallmentRow {
  const payment = roundMoney(principalPaid + interest);
  const balance = roundMoney(balanceBefore - principalPaid);
  return { number, payment, interest, principal: principalPaid, insurance, balance };
}

/**
 * Genera el cronograma de amortizacion completo por sistema aleman.
 *
 * El abono a capital es constante (P / n); el residuo de redondeo se reconcilia
 * en la ultima cuota para que el saldo cierre exactamente en cero.
 * @param input - Capital, tasa mensual, numero de cuotas y seguro opcional.
 * @returns El cronograma con sus filas y totales agregados.
 */
export function generateGermanSchedule(
  input: AmortizationInput,
): AmortizationSchedule {
  validateAmortizationInput(input);
  const { principal, monthlyRate, numberOfInstallments: n } = input;
  const insurance = input.insurance ?? NO_INSURANCE;
  const interestMode = input.interestMode ?? 'monthly';
  const anchorDate = input.anchorDate;

  const constantPrincipal = roundMoney(principal / n);
  const rows: InstallmentRow[] = [];
  let balance = principal;

  for (let period = 1; period <= n; period += 1) {
    const isLast = period === n;
    const interest = accruePeriodInterest(balance, monthlyRate, interestMode, anchorDate, period);
    // En la ultima cuota se abona el saldo restante para cerrar en 0.
    const principalPaid = isLast ? balance : constantPrincipal;
    const row = buildRow(period, principalPaid, interest, balance, computeInsurance(insurance, balance));
    rows.push(row);
    balance = row.balance;
  }

  return {
    rows,
    totalInterest: roundMoney(rows.reduce((sum, r) => sum + r.interest, 0)),
    totalInsurance: roundMoney(rows.reduce((sum, r) => sum + r.insurance, 0)),
    totalPaid: roundMoney(rows.reduce((sum, r) => sum + r.payment, 0)),
  };
}
