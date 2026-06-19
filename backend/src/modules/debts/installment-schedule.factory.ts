import { generateAmericanSchedule } from '../../domain/amortization/american-amortization';
import {
  AmortizationInput,
  AmortizationSchedule,
} from '../../domain/amortization/amortization.types';
import { generateFrenchSchedule } from '../../domain/amortization/french-amortization';
import { generateGermanSchedule } from '../../domain/amortization/german-amortization';
import { InsuranceConfig, NO_INSURANCE } from '../../domain/insurance/insurance';
import { InterestMode } from '../../domain/interest/interest-accrual';
import { addMonths } from '../../shared/date/add-months';

/** Sistema de amortizacion tal como se persiste (enum de la BD). */
export type AmortizationSystem = 'frances' | 'aleman' | 'americano';

/** Datos de una cuota listos para insertar (montos como string NUMERIC). */
export interface InstallmentSeed {
  number: number;
  dueDate: string;
  principalPortion: string;
  interestPortion: string;
  insurancePortion: string;
  totalAmount: string;
  remainingBalance: string;
}

/** Cronograma listo para persistir, con totales agregados. */
export interface ScheduleSeed {
  rows: InstallmentSeed[];
  totalInterest: number;
  totalInsurance: number;
  totalPaid: number;
}

/**
 * Selecciona el generador del dominio segun el sistema de amortizacion.
 * @param system - Sistema de amortizacion.
 * @returns La funcion del dominio que genera el cronograma.
 */
function selectGenerator(
  system: AmortizationSystem,
): (input: AmortizationInput) => AmortizationSchedule {
  switch (system) {
    case 'frances':
      return generateFrenchSchedule;
    case 'aleman':
      return generateGermanSchedule;
    case 'americano':
      return generateAmericanSchedule;
    default: {
      const exhaustiveCheck: never = system;
      throw new Error(`Sistema de amortizacion no soportado: ${String(exhaustiveCheck)}`);
    }
  }
}

/**
 * Mapea una fila del dominio a una cuota persistible. El total incluye el seguro.
 * @param number - Numero de cuota absoluto.
 * @param dueDate - Fecha de vencimiento.
 * @param row - Fila del cronograma del dominio.
 * @returns La cuota lista para insertar.
 */
function toSeed(
  number: number,
  dueDate: string,
  row: { principal: number; interest: number; insurance: number; payment: number; balance: number },
): InstallmentSeed {
  return {
    number,
    dueDate,
    principalPortion: row.principal.toFixed(2),
    interestPortion: row.interest.toFixed(2),
    insurancePortion: row.insurance.toFixed(2),
    totalAmount: (row.payment + row.insurance).toFixed(2),
    remainingBalance: row.balance.toFixed(2),
  };
}

/**
 * Genera el cronograma de una deuda y lo deja listo para persistir.
 *
 * Calcula la fecha de vencimiento de cada cuota (un mes despues de la anterior)
 * y formatea los montos como strings NUMERIC. El seguro se suma al total.
 * @param system - Sistema de amortizacion (frances/aleman/americano).
 * @param principal - Capital del credito.
 * @param monthlyRate - Tasa mensual efectiva como fraccion decimal.
 * @param termMonths - Numero de cuotas.
 * @param startDate - Fecha de inicio del credito (YYYY-MM-DD).
 * @param insurance - Configuracion del seguro (opcional).
 * @returns Las filas de cuotas y los totales del cronograma.
 */
export function buildSchedule(
  system: AmortizationSystem,
  principal: number,
  monthlyRate: number,
  termMonths: number,
  startDate: string,
  insurance: InsuranceConfig = NO_INSURANCE,
  interestMode: InterestMode = 'monthly',
): ScheduleSeed {
  const generator = selectGenerator(system);
  const schedule = generator({
    principal,
    monthlyRate,
    numberOfInstallments: termMonths,
    insurance,
    interestMode,
    // El interes diario se ancla a la fecha de inicio del credito.
    anchorDate: startDate,
  });
  const rows = schedule.rows.map((row) => toSeed(row.number, addMonths(startDate, row.number), row));
  return {
    rows,
    totalInterest: schedule.totalInterest,
    totalInsurance: schedule.totalInsurance,
    totalPaid: schedule.totalPaid,
  };
}

/**
 * Convierte un cronograma del dominio en cuotas persistibles, asignando numeros
 * de cuota absolutos y fechas de vencimiento ancladas a la fecha de inicio.
 *
 * Se usa al recalcular tras un abono a capital: las cuotas nuevas reemplazan a
 * las pendientes conservando la numeracion y la cadencia mensual originales.
 * @param schedule - Cronograma generado por el dominio (filas locales 1..k).
 * @param firstNumber - Numero de cuota absoluto de la primera fila nueva.
 * @param debtStartDate - Fecha de inicio del credito (YYYY-MM-DD).
 * @returns Las cuotas listas para insertar.
 */
export function scheduleToSeeds(
  schedule: AmortizationSchedule,
  firstNumber: number,
  debtStartDate: string,
): InstallmentSeed[] {
  return schedule.rows.map((row, index) => {
    const number = firstNumber + index;
    return toSeed(number, addMonths(debtStartDate, number), row);
  });
}
