import { computeInsurance, InsuranceConfig, NO_INSURANCE } from '../insurance/insurance';
import { roundMoney } from '../shared/money';
import {
  AmortizationInput,
  AmortizationSchedule,
  InstallmentRow,
} from './amortization.types';
import { validateAmortizationInput } from './amortization.validation';

/**
 * Motor de amortizacion por sistema frances (cuota fija).
 *
 * En el sistema frances la cuota periodica es constante: al inicio predomina
 * el interes y, a medida que baja el saldo, crece la porcion de capital.
 *
 * Cuota fija:  C = P * i / (1 - (1 + i)^-n)
 *   donde P = capital, i = tasa mensual, n = numero de cuotas.
 * Si i = 0, la cuota es simplemente P / n.
 *
 * El seguro (si lo hay) se suma a la cuota sin alterar la amortizacion.
 */

/**
 * Calcula la cuota fija del sistema frances.
 * @param principal - Capital prestado.
 * @param monthlyRate - Tasa mensual efectiva como fraccion decimal.
 * @param n - Numero de cuotas.
 * @returns La cuota periodica fija, redondeada a centavos.
 */
export function calculateFixedPayment(
  principal: number,
  monthlyRate: number,
  n: number,
): number {
  if (monthlyRate === 0) {
    return roundMoney(principal / n);
  }
  const factor = Math.pow(1 + monthlyRate, -n);
  return roundMoney((principal * monthlyRate) / (1 - factor));
}

/**
 * Construye una fila del cronograma para un periodo dado.
 * @param number - Numero de cuota (empieza en 1).
 * @param payment - Cuota de amortizacion del periodo (capital + interes).
 * @param interest - Interes del periodo.
 * @param balanceBefore - Saldo de capital antes del pago.
 * @param insurance - Valor del seguro del periodo.
 * @returns La fila con su desglose y el saldo resultante.
 */
function buildRow(
  number: number,
  payment: number,
  interest: number,
  balanceBefore: number,
  insurance: number,
): InstallmentRow {
  const principalPaid = roundMoney(payment - interest);
  const balance = roundMoney(balanceBefore - principalPaid);
  return { number, payment, interest, principal: principalPaid, insurance, balance };
}

/**
 * Suma el total del seguro de un conjunto de cuotas.
 * @param rows - Filas del cronograma.
 * @returns El total del seguro, redondeado.
 */
function totalInsuranceOf(rows: InstallmentRow[]): number {
  return roundMoney(rows.reduce((sum, r) => sum + r.insurance, 0));
}

/**
 * Genera el cronograma de amortizacion completo por sistema frances.
 *
 * Cada cuota se redondea a centavos; el residuo de redondeo se reconcilia en
 * la ultima cuota para que el saldo cierre exactamente en cero.
 * @param input - Capital, tasa mensual, numero de cuotas y seguro opcional.
 * @returns El cronograma con sus filas y totales agregados.
 */
export function generateFrenchSchedule(
  input: AmortizationInput,
): AmortizationSchedule {
  validateAmortizationInput(input);
  const { principal, monthlyRate, numberOfInstallments: n } = input;
  const insurance = input.insurance ?? NO_INSURANCE;

  const fixedPayment = calculateFixedPayment(principal, monthlyRate, n);
  const rows: InstallmentRow[] = [];
  let balance = principal;

  for (let period = 1; period <= n; period += 1) {
    const isLast = period === n;
    const interest = roundMoney(balance * monthlyRate);

    // En la ultima cuota se paga el saldo restante + su interes para cerrar en 0.
    const payment = isLast ? roundMoney(balance + interest) : fixedPayment;
    const row = buildRow(period, payment, interest, balance, computeInsurance(insurance, balance));
    rows.push(row);
    balance = row.balance;
  }

  return {
    fixedPayment,
    rows,
    totalInterest: roundMoney(rows.reduce((sum, r) => sum + r.interest, 0)),
    totalInsurance: totalInsuranceOf(rows),
    totalPaid: roundMoney(rows.reduce((sum, r) => sum + r.payment, 0)),
  };
}

/** Tope de seguridad de periodos para evitar bucles infinitos en el amortizador. */
const MAX_PERIODS = 1200;

/**
 * Amortiza un saldo con una cuota fija dada hasta cancelarlo por completo.
 *
 * A diferencia de `generateFrenchSchedule` (que calcula la cuota a partir del
 * plazo), aqui la cuota es el dato de entrada y el numero de periodos se deduce.
 * Se usa al reducir plazo tras un abono a capital: se conserva la cuota previa
 * y el credito se salda en menos cuotas. La ultima cuota cierra el saldo en 0.
 * @param principal - Saldo a amortizar.
 * @param monthlyRate - Tasa mensual efectiva como fraccion decimal.
 * @param fixedPayment - Cuota fija (capital + interes) que se mantendra.
 * @param insurance - Configuracion del seguro (opcional).
 * @returns El cronograma resultante con sus filas y totales.
 * @throws Error si la cuota no cubre el interes del primer periodo.
 */
export function amortizeWithPayment(
  principal: number,
  monthlyRate: number,
  fixedPayment: number,
  insurance: InsuranceConfig = NO_INSURANCE,
): AmortizationSchedule {
  const firstInterest = principal * monthlyRate;
  if (monthlyRate > 0 && fixedPayment <= firstInterest) {
    throw new Error('La cuota no cubre el interes: el saldo nunca se amortizaria.');
  }

  const rows: InstallmentRow[] = [];
  let balance = principal;
  let period = 1;

  while (balance > 0 && period <= MAX_PERIODS) {
    const interest = roundMoney(balance * monthlyRate);
    const isLast = fixedPayment >= balance + interest;
    const payment = isLast ? roundMoney(balance + interest) : fixedPayment;
    const row = buildRow(period, payment, interest, balance, computeInsurance(insurance, balance));
    rows.push(row);
    balance = row.balance;
    period += 1;
  }

  return {
    fixedPayment,
    rows,
    totalInterest: roundMoney(rows.reduce((sum, r) => sum + r.interest, 0)),
    totalInsurance: totalInsuranceOf(rows),
    totalPaid: roundMoney(rows.reduce((sum, r) => sum + r.payment, 0)),
  };
}
