import { InsuranceConfig, NO_INSURANCE } from '../insurance/insurance';
import { InterestMode } from '../interest/interest-accrual';
import { roundMoney } from '../shared/money';
import { AmortizationSchedule } from './amortization.types';
import {
  amortizeWithPayment,
  generateFrenchSchedule,
} from './french-amortization';
import {
  PrepaymentInput,
  PrepaymentMode,
  PrepaymentResult,
} from './prepayment.types';

/**
 * Recalculo del cronograma frances tras un abono a capital (prepago sin sancion,
 * Ley 1555 de 2012). El deudor puede reducir el plazo (conservando la cuota) o
 * reducir la cuota (conservando el plazo).
 */

/**
 * Valida los parametros del abono a capital.
 * @param input - Parametros del prepago.
 * @throws Error si el saldo, la tasa, las cuotas o el abono son invalidos.
 */
function validatePrepayment(input: PrepaymentInput): void {
  const { currentBalance, monthlyRate, remainingInstallments, extraPayment } =
    input;
  if (currentBalance <= 0) {
    throw new Error('El saldo actual debe ser mayor que cero.');
  }
  if (monthlyRate < 0) {
    throw new Error('La tasa mensual no puede ser negativa.');
  }
  if (!Number.isInteger(remainingInstallments) || remainingInstallments <= 0) {
    throw new Error('Las cuotas restantes deben ser un entero mayor que cero.');
  }
  if (extraPayment <= 0) {
    throw new Error('El abono a capital debe ser mayor que cero.');
  }
}

/** Cronograma vacio que representa una obligacion ya cancelada. */
const PAID_OFF_SCHEDULE: AmortizationSchedule = {
  rows: [],
  totalInterest: 0,
  totalInsurance: 0,
  totalPaid: 0,
};

/**
 * Proyecta el cronograma restante segun la modalidad elegida.
 * @param mode - Modalidad de prepago.
 * @param newBalance - Saldo tras el abono.
 * @param monthlyRate - Tasa mensual efectiva.
 * @param remainingInstallments - Cuotas que quedaban antes del abono.
 * @param previousPayment - Cuota vigente antes del abono (para reducir plazo).
 * @param insurance - Configuracion del seguro a conservar.
 * @returns El cronograma proyectado de las cuotas restantes.
 */
function projectSchedule(
  mode: PrepaymentMode,
  newBalance: number,
  monthlyRate: number,
  remainingInstallments: number,
  previousPayment: number,
  insurance: InsuranceConfig,
  interestMode: InterestMode,
  anchorDate: string | undefined,
): AmortizationSchedule {
  if (mode === PrepaymentMode.REDUCE_INSTALLMENT) {
    // Mismo plazo, nueva cuota mas baja sobre el saldo reducido.
    return generateFrenchSchedule({
      principal: newBalance,
      monthlyRate,
      numberOfInstallments: remainingInstallments,
      insurance,
      interestMode,
      anchorDate,
    });
  }
  // REDUCE_TERM: se conserva la cuota previa y se salda en menos periodos.
  return amortizeWithPayment(newBalance, monthlyRate, previousPayment, insurance, interestMode, anchorDate);
}

/**
 * Aplica un abono a capital y recalcula el cronograma frances restante.
 *
 * Si el abono iguala o supera el saldo, la obligacion queda cancelada. El ahorro
 * de intereses se mide frente a continuar el cronograma original sin abonar.
 * @param input - Saldo, tasa, cuotas restantes, abono y modalidad.
 * @returns El resultado con el cronograma proyectado y el ahorro de intereses.
 */
export function applyPrepayment(input: PrepaymentInput): PrepaymentResult {
  validatePrepayment(input);
  const { currentBalance, monthlyRate, remainingInstallments, extraPayment, mode } =
    input;
  const insurance = input.insurance ?? NO_INSURANCE;
  const interestMode = input.interestMode ?? 'monthly';
  const anchorDate = input.anchorDate;

  // Intereses que se pagarian si no se abonara nada (linea base de comparacion).
  const originalSchedule = generateFrenchSchedule({
    principal: currentBalance,
    monthlyRate,
    numberOfInstallments: remainingInstallments,
    insurance,
    interestMode,
    anchorDate,
  });

  const appliedExtraPayment = Math.min(extraPayment, currentBalance);
  const newBalance = roundMoney(currentBalance - appliedExtraPayment);

  if (newBalance <= 0) {
    return {
      mode,
      appliedExtraPayment,
      newBalance: 0,
      isPaidOff: true,
      schedule: PAID_OFF_SCHEDULE,
      interestSaved: originalSchedule.totalInterest,
    };
  }

  const schedule = projectSchedule(
    mode,
    newBalance,
    monthlyRate,
    remainingInstallments,
    originalSchedule.fixedPayment ?? 0,
    insurance,
    interestMode,
    anchorDate,
  );

  return {
    mode,
    appliedExtraPayment,
    newBalance,
    isPaidOff: false,
    schedule,
    interestSaved: roundMoney(
      originalSchedule.totalInterest - schedule.totalInterest,
    ),
  };
}
