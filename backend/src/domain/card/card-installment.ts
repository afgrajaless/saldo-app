import { generateFrenchSchedule } from '../amortization/french-amortization';
import { addMonths } from '../../shared/date/add-months';
import { roundMoney } from '../shared/money';

/**
 * Parametros de entrada para construir el cronograma de una compra diferida.
 */
export interface InstallmentScheduleInput {
  /** Capital total de la compra diferida (en pesos). */
  principal: number;
  /** Tasa mensual efectiva como fraccion decimal (ej. 0.02 para 2 % M.V.). */
  monthlyRate: number;
  /** Numero de cuotas en que se difiere la compra. */
  numberOfInstallments: number;
  /** Fecha de compra en formato YYYY-MM-DD; la cuota 1 vence un mes despues. */
  startDate: string;
}

/**
 * Una cuota del cronograma de compra diferida.
 */
export interface InstallmentItem {
  /** Numero de cuota (inicia en 1). */
  number: number;
  /** Fecha de vencimiento de la cuota en formato YYYY-MM-DD. */
  dueOn: string;
  /** Porcion de capital amortizado en esta cuota. */
  principal: number;
  /** Interes del periodo. */
  interest: number;
  /** Saldo de capital pendiente despues de esta cuota. */
  balance: number;
}

/**
 * Construye el cronograma cuota a cuota de una compra diferida en tarjeta de credito.
 *
 * Reutiliza el motor frances (`generateFrenchSchedule`) para calcular la
 * amortizacion y asigna la fecha de vencimiento de cada cuota segun:
 *   dueOn(n) = addMonths(startDate, n)
 * La suma de los capitales amortizados cierra exactamente en `principal`.
 *
 * @param input - Capital, tasa mensual, numero de cuotas y fecha de compra.
 * @returns Arreglo de cuotas con numero, fecha de vencimiento, principal, interes y saldo.
 */
export function buildInstallmentSchedule(
  input: InstallmentScheduleInput,
): InstallmentItem[] {
  const { principal, monthlyRate, numberOfInstallments, startDate } = input;

  const schedule = generateFrenchSchedule({
    principal,
    monthlyRate,
    numberOfInstallments,
  });

  // Mapea cada fila del motor frances a la estructura de cuota diferida.
  // La cuota N vence addMonths(startDate, N) — la primera un mes despues de la compra.
  return schedule.rows.map((row) => ({
    number: row.number,
    dueOn: addMonths(startDate, row.number),
    principal: roundMoney(row.principal),
    interest: roundMoney(row.interest),
    balance: roundMoney(row.balance),
  }));
}
