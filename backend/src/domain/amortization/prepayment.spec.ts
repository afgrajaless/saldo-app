import { calculateFixedPayment } from './french-amortization';
import { applyPrepayment } from './prepayment';
import { PrepaymentMode } from './prepayment.types';

describe('Abono a capital (prepago Ley 1555/2012)', () => {
  const base = {
    currentBalance: 1_000_000,
    monthlyRate: 0.02,
    remainingInstallments: 12,
    extraPayment: 200_000,
  };

  describe('validacion', () => {
    it('rechaza un abono no positivo', () => {
      expect(() =>
        applyPrepayment({ ...base, extraPayment: 0, mode: PrepaymentMode.REDUCE_TERM }),
      ).toThrow('abono a capital');
    });

    it('rechaza un saldo no positivo', () => {
      expect(() =>
        applyPrepayment({
          ...base,
          currentBalance: 0,
          mode: PrepaymentMode.REDUCE_TERM,
        }),
      ).toThrow('saldo actual');
    });
  });

  describe('reducir cuota (REDUCE_INSTALLMENT)', () => {
    const result = applyPrepayment({
      ...base,
      mode: PrepaymentMode.REDUCE_INSTALLMENT,
    });

    it('conserva el numero de cuotas restantes', () => {
      expect(result.schedule.rows).toHaveLength(12);
    });

    it('baja la cuota respecto a la original', () => {
      const originalPayment = calculateFixedPayment(1_000_000, 0.02, 12);
      expect(result.schedule.fixedPayment).toBeLessThan(originalPayment);
    });

    it('reduce el saldo y cierra el cronograma en cero', () => {
      expect(result.newBalance).toBe(800_000);
      expect(result.schedule.rows[11].balance).toBe(0);
    });

    it('ahorra intereses frente a no abonar', () => {
      expect(result.interestSaved).toBeGreaterThan(0);
    });
  });

  describe('reducir plazo (REDUCE_TERM)', () => {
    const result = applyPrepayment({
      ...base,
      mode: PrepaymentMode.REDUCE_TERM,
    });

    it('salda el credito en menos cuotas', () => {
      expect(result.schedule.rows.length).toBeLessThan(12);
    });

    it('conserva (aprox.) la cuota original salvo la ultima', () => {
      const originalPayment = calculateFixedPayment(1_000_000, 0.02, 12);
      expect(result.schedule.rows[0].payment).toBeCloseTo(originalPayment, 2);
    });

    it('cierra el saldo en cero', () => {
      const rows = result.schedule.rows;
      expect(rows[rows.length - 1].balance).toBe(0);
    });

    it('ahorra mas intereses que reducir cuota', () => {
      const reduceInstallment = applyPrepayment({
        ...base,
        mode: PrepaymentMode.REDUCE_INSTALLMENT,
      });
      expect(result.interestSaved).toBeGreaterThan(
        reduceInstallment.interestSaved,
      );
    });
  });

  describe('abono que cancela la obligacion', () => {
    const result = applyPrepayment({
      ...base,
      extraPayment: 1_000_000,
      mode: PrepaymentMode.REDUCE_TERM,
    });

    it('marca la obligacion como cancelada sin cuotas restantes', () => {
      expect(result.isPaidOff).toBe(true);
      expect(result.newBalance).toBe(0);
      expect(result.schedule.rows).toHaveLength(0);
    });

    it('acota el abono aplicado al saldo pendiente', () => {
      const over = applyPrepayment({
        ...base,
        extraPayment: 5_000_000,
        mode: PrepaymentMode.REDUCE_TERM,
      });
      expect(over.appliedExtraPayment).toBe(1_000_000);
      expect(over.isPaidOff).toBe(true);
    });
  });
});
