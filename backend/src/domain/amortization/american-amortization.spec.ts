import { generateAmericanSchedule } from './american-amortization';

describe('Amortizacion americana (interes periodico + capital al final)', () => {
  it('rechaza un numero de cuotas invalido', () => {
    expect(() =>
      generateAmericanSchedule({
        principal: 1_000_000,
        monthlyRate: 0.02,
        numberOfInstallments: 0,
      }),
    ).toThrow('numero de cuotas');
  });

  describe('credito de 1.000.000 al 2% mensual a 6 cuotas', () => {
    const schedule = generateAmericanSchedule({
      principal: 1_000_000,
      monthlyRate: 0.02,
      numberOfInstallments: 6,
    });

    it('paga solo interes (20.000) en las primeras cuotas', () => {
      for (let i = 0; i < 5; i += 1) {
        expect(schedule.rows[i].interest).toBe(20_000);
        expect(schedule.rows[i].principal).toBe(0);
        expect(schedule.rows[i].payment).toBe(20_000);
        expect(schedule.rows[i].balance).toBe(1_000_000);
      }
    });

    it('abona todo el capital en la ultima cuota', () => {
      const last = schedule.rows[5];
      expect(last.principal).toBe(1_000_000);
      expect(last.interest).toBe(20_000);
      expect(last.payment).toBe(1_020_000);
      expect(last.balance).toBe(0);
    });

    it('acumula el interes de los 6 periodos', () => {
      expect(schedule.totalInterest).toBe(120_000);
      expect(schedule.totalPaid).toBe(1_120_000);
    });
  });
});
