import { RateType } from '../rates/rate-type';
import {
  calculateUsuryCap,
  evaluateUsury,
  evaluateUsuryFromRate,
} from './usury-evaluation';

describe('Evaluacion de usura', () => {
  describe('calculateUsuryCap', () => {
    it('aplica el factor legal 1.5 sobre el IBC', () => {
      expect(calculateUsuryCap(0.2)).toBeCloseTo(0.3, 10);
    });

    it('rechaza un IBC negativo', () => {
      expect(() => calculateUsuryCap(-0.1)).toThrow('IBC');
    });
  });

  describe('evaluateUsury', () => {
    it('marca como usuraria una tasa que supera el tope', () => {
      const result = evaluateUsury(0.31, 0.2968);
      expect(result.isUsurious).toBe(true);
      expect(result.marginPoints).toBeLessThan(0);
      expect(result.usagePercentage).toBeGreaterThan(100);
    });

    it('acepta como legal una tasa por debajo del tope', () => {
      const result = evaluateUsury(0.28, 0.2968);
      expect(result.isUsurious).toBe(false);
      expect(result.marginPoints).toBeCloseTo(0.0168, 6);
      expect(result.usagePercentage).toBeCloseTo(94.34, 2);
    });

    it('considera legal una tasa exactamente igual al tope', () => {
      const result = evaluateUsury(0.2968, 0.2968);
      expect(result.isUsurious).toBe(false);
      expect(result.marginPoints).toBe(0);
      expect(result.usagePercentage).toBe(100);
    });

    it('rechaza un tope de usura no positivo', () => {
      expect(() => evaluateUsury(0.2, 0)).toThrow('tope de usura');
    });
  });

  describe('evaluateUsuryFromRate', () => {
    it('normaliza una mensual a E.A. antes de comparar', () => {
      // 2% M.V. -> ~26.82% E.A., por debajo de un tope del 29.68%.
      const result = evaluateUsuryFromRate(0.02, RateType.MONTHLY_EFFECTIVE, 0.2968);
      expect(result.effectiveAnnualRate).toBeCloseTo(0.268242, 6);
      expect(result.isUsurious).toBe(false);
    });

    it('detecta usura cuando la mensual equivale a una E.A. sobre el tope', () => {
      // 3% M.V. -> ~42.58% E.A., supera el tope del 29.68%.
      const result = evaluateUsuryFromRate(0.03, RateType.MONTHLY_EFFECTIVE, 0.2968);
      expect(result.isUsurious).toBe(true);
    });
  });
});
