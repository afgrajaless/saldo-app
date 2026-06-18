import { roundMoney } from '../shared/money';
import { generateGermanSchedule } from './german-amortization';

describe('Amortizacion alemana (abono constante)', () => {
  it('rechaza entradas invalidas', () => {
    expect(() =>
      generateGermanSchedule({
        principal: -1,
        monthlyRate: 0.02,
        numberOfInstallments: 12,
      }),
    ).toThrow('El capital');
  });

  describe('credito de 1.200.000 al 2% mensual a 12 cuotas', () => {
    const schedule = generateGermanSchedule({
      principal: 1_200_000,
      monthlyRate: 0.02,
      numberOfInstallments: 12,
    });

    it('genera 12 cuotas y no expone cuota fija', () => {
      expect(schedule.rows).toHaveLength(12);
      expect(schedule.fixedPayment).toBeUndefined();
    });

    it('mantiene el abono a capital constante (100.000)', () => {
      for (const row of schedule.rows) {
        expect(row.principal).toBe(100_000);
      }
    });

    it('la primera cuota incluye 24.000 de interes', () => {
      expect(schedule.rows[0].interest).toBe(24_000);
      expect(schedule.rows[0].payment).toBe(124_000);
    });

    it('la cuota total decrece periodo a periodo', () => {
      for (let i = 1; i < schedule.rows.length; i += 1) {
        expect(schedule.rows[i].payment).toBeLessThan(
          schedule.rows[i - 1].payment,
        );
      }
    });

    it('cierra el saldo en cero y la suma de capital iguala el principal', () => {
      expect(schedule.rows[11].balance).toBe(0);
      const totalPrincipal = roundMoney(
        schedule.rows.reduce((sum, r) => sum + r.principal, 0),
      );
      expect(totalPrincipal).toBe(1_200_000);
    });
  });
});
