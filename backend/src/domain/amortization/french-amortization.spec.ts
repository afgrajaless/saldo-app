import { roundMoney } from '../shared/money';
import { generateFrenchSchedule } from './french-amortization';

describe('Amortizacion francesa (cuota fija)', () => {
  describe('validacion de entrada', () => {
    it('rechaza capital menor o igual a cero', () => {
      expect(() =>
        generateFrenchSchedule({
          principal: 0,
          monthlyRate: 0.02,
          numberOfInstallments: 12,
        }),
      ).toThrow('El capital');
    });

    it('rechaza tasa mensual negativa', () => {
      expect(() =>
        generateFrenchSchedule({
          principal: 1_000_000,
          monthlyRate: -0.01,
          numberOfInstallments: 12,
        }),
      ).toThrow('La tasa mensual');
    });

    it('rechaza un numero de cuotas no entero o no positivo', () => {
      expect(() =>
        generateFrenchSchedule({
          principal: 1_000_000,
          monthlyRate: 0.02,
          numberOfInstallments: 0,
        }),
      ).toThrow('numero de cuotas');
    });
  });

  describe('credito de 1.000.000 al 2% mensual a 12 cuotas', () => {
    const schedule = generateFrenchSchedule({
      principal: 1_000_000,
      monthlyRate: 0.02,
      numberOfInstallments: 12,
    });

    it('calcula la cuota fija (~94.559,60)', () => {
      expect(schedule.fixedPayment).toBeCloseTo(94_559.6, 1);
    });

    it('genera exactamente 12 cuotas', () => {
      expect(schedule.rows).toHaveLength(12);
    });

    it('cierra el saldo en cero en la ultima cuota', () => {
      expect(schedule.rows[schedule.rows.length - 1].balance).toBe(0);
    });

    it('la suma de capital pagado iguala el principal', () => {
      const totalPrincipal = roundMoney(
        schedule.rows.reduce((sum, r) => sum + r.principal, 0),
      );
      expect(totalPrincipal).toBe(1_000_000);
    });

    it('total pagado = capital + intereses', () => {
      expect(schedule.totalPaid).toBeCloseTo(
        1_000_000 + schedule.totalInterest,
        2,
      );
    });

    it('en cada cuota: pago = capital + interes', () => {
      for (const row of schedule.rows) {
        expect(roundMoney(row.principal + row.interest)).toBeCloseTo(
          row.payment,
          2,
        );
      }
    });

    it('el interes decrece cuota a cuota', () => {
      for (let i = 1; i < schedule.rows.length; i += 1) {
        expect(schedule.rows[i].interest).toBeLessThan(
          schedule.rows[i - 1].interest,
        );
      }
    });
  });

  describe('credito sin interes (tasa 0%)', () => {
    const schedule = generateFrenchSchedule({
      principal: 1_200_000,
      monthlyRate: 0,
      numberOfInstallments: 12,
    });

    it('reparte el capital en cuotas iguales sin intereses', () => {
      expect(schedule.fixedPayment).toBe(100_000);
      expect(schedule.totalInterest).toBe(0);
      expect(schedule.rows[11].balance).toBe(0);
    });
  });
});
