import { generateFrenchSchedule } from '../amortization/french-amortization';
import { accruePeriodInterest } from './interest-accrual';

describe('accruePeriodInterest', () => {
  it('en modo mensual usa saldo * tasa', () => {
    expect(accruePeriodInterest(1_000_000, 0.02, 'monthly', undefined, 1)).toBe(20000);
  });

  it('en modo diario cobra mas en un mes de 31 dias que en uno de 28', () => {
    // Periodo 1: ene (31 dias). Periodo 2: feb (28 dias) en 2026.
    const ene = accruePeriodInterest(1_000_000, 0.02, 'daily', '2025-12-31', 1);
    const feb = accruePeriodInterest(1_000_000, 0.02, 'daily', '2026-01-31', 1);
    expect(ene).toBeGreaterThan(feb);
  });
});

describe('Amortizacion francesa con interes diario', () => {
  it('produce un cronograma valido que cierra el saldo en cero', () => {
    const schedule = generateFrenchSchedule({
      principal: 2_594_271,
      monthlyRate: 0.018167, // ~24.12% E.A.
      numberOfInstallments: 36,
      interestMode: 'daily',
      anchorDate: '2025-09-01',
    });
    expect(schedule.rows).toHaveLength(36);
    expect(schedule.rows[35].balance).toBe(0);
    // El interes total diario difiere del mensual (depende de los dias por mes).
    const monthly = generateFrenchSchedule({
      principal: 2_594_271,
      monthlyRate: 0.018167,
      numberOfInstallments: 36,
    });
    expect(schedule.totalInterest).not.toBe(monthly.totalInterest);
  });
});
