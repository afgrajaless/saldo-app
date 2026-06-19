import { generateFrenchSchedule } from '../amortization/french-amortization';
import { computeInsurance, InsuranceMode, NO_INSURANCE } from './insurance';

describe('computeInsurance', () => {
  it('devuelve 0 sin seguro', () => {
    expect(computeInsurance(NO_INSURANCE, 1_000_000)).toBe(0);
  });

  it('aplica una tasa sobre el saldo', () => {
    expect(computeInsurance({ mode: InsuranceMode.RATE, value: 0.001 }, 2_000_000)).toBe(2000);
  });

  it('devuelve el monto fijo sin importar el saldo', () => {
    expect(computeInsurance({ mode: InsuranceMode.FIXED, value: 1811 }, 5_000_000)).toBe(1811);
    expect(computeInsurance({ mode: InsuranceMode.FIXED, value: 1811 }, 100)).toBe(1811);
  });
});

describe('Amortizacion francesa con seguro', () => {
  it('el seguro fijo se suma a cada cuota sin alterar capital/interes', () => {
    const sin = generateFrenchSchedule({
      principal: 1_000_000,
      monthlyRate: 0.02,
      numberOfInstallments: 12,
    });
    const con = generateFrenchSchedule({
      principal: 1_000_000,
      monthlyRate: 0.02,
      numberOfInstallments: 12,
      insurance: { mode: InsuranceMode.FIXED, value: 5000 },
    });

    // El capital y el interes no cambian.
    expect(con.totalInterest).toBe(sin.totalInterest);
    expect(con.rows[0].principal).toBe(sin.rows[0].principal);
    // El seguro es 5000 por cuota -> 60000 en total.
    expect(con.rows[0].insurance).toBe(5000);
    expect(con.totalInsurance).toBe(60000);
  });

  it('el seguro por tasa decrece con el saldo', () => {
    const schedule = generateFrenchSchedule({
      principal: 1_000_000,
      monthlyRate: 0.02,
      numberOfInstallments: 12,
      insurance: { mode: InsuranceMode.RATE, value: 0.001 },
    });
    // Primera cuota: 0.001 * 1.000.000 = 1000.
    expect(schedule.rows[0].insurance).toBe(1000);
    // La ultima cuota tiene menos seguro que la primera (saldo menor).
    expect(schedule.rows[11].insurance).toBeLessThan(schedule.rows[0].insurance);
  });
});
