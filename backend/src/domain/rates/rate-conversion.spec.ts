import {
  effectiveAnnualToMonthly,
  monthlyToEffectiveAnnual,
  monthlyToNominalAnnual,
  nominalAnnualToMonthly,
  normalizeToEffectiveAnnual,
  normalizeToMonthly,
} from './rate-conversion';
import { RateType } from './rate-type';

describe('Conversion de tasas', () => {
  describe('Efectiva Anual <-> Mensual Vencida', () => {
    it('convierte 24% E.A. a su mensual equivalente (~1.8088%)', () => {
      expect(effectiveAnnualToMonthly(0.24)).toBeCloseTo(0.018088, 6);
    });

    it('convierte 2% M.V. a su E.A. equivalente (~26.824%)', () => {
      expect(monthlyToEffectiveAnnual(0.02)).toBeCloseTo(0.268242, 6);
    });

    it('es reversible: E.A. -> M.V. -> E.A. devuelve la tasa original', () => {
      const original = 0.2812;
      const roundTrip = monthlyToEffectiveAnnual(
        effectiveAnnualToMonthly(original),
      );
      expect(roundTrip).toBeCloseTo(original, 10);
    });
  });

  describe('Nominal Mes Vencido <-> Mensual Vencida', () => {
    it('convierte 24% N.M.V. a 2% mensual', () => {
      expect(nominalAnnualToMonthly(0.24)).toBeCloseTo(0.02, 10);
    });

    it('convierte 2% mensual a 24% N.M.V.', () => {
      expect(monthlyToNominalAnnual(0.02)).toBeCloseTo(0.24, 10);
    });
  });

  describe('normalizeToEffectiveAnnual', () => {
    it('deja una E.A. sin cambios', () => {
      expect(normalizeToEffectiveAnnual(0.24, RateType.EFFECTIVE_ANNUAL)).toBe(
        0.24,
      );
    });

    it('normaliza una mensual a E.A.', () => {
      expect(
        normalizeToEffectiveAnnual(0.02, RateType.MONTHLY_EFFECTIVE),
      ).toBeCloseTo(0.268242, 6);
    });

    it('normaliza una N.M.V. de 24% a E.A. (~26.824%)', () => {
      expect(
        normalizeToEffectiveAnnual(0.24, RateType.NOMINAL_ANNUAL),
      ).toBeCloseTo(0.268242, 6);
    });
  });

  describe('normalizeToMonthly', () => {
    it('normaliza una E.A. de 24% a su mensual (~1.8088%)', () => {
      expect(
        normalizeToMonthly(0.24, RateType.EFFECTIVE_ANNUAL),
      ).toBeCloseTo(0.018088, 6);
    });

    it('deja una mensual sin cambios', () => {
      expect(normalizeToMonthly(0.02, RateType.MONTHLY_EFFECTIVE)).toBe(0.02);
    });

    it('normaliza una N.M.V. de 24% a 2% mensual', () => {
      expect(
        normalizeToMonthly(0.24, RateType.NOMINAL_ANNUAL),
      ).toBeCloseTo(0.02, 10);
    });
  });
});
