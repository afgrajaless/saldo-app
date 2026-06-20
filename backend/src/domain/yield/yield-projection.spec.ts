import {
  accrualSchedule,
  dailyRate,
  projectCdt,
  projectSavingsBalance,
  savingsYield,
} from './yield-projection';

describe('yield-projection', () => {
  describe('dailyRate', () => {
    it('la tasa diaria capitalizada 365 veces reproduce la E.A.', () => {
      const d = dailyRate(0.1125);
      const recomposed = Math.pow(1 + d, 365) - 1;
      expect(recomposed).toBeCloseTo(0.1125, 6);
    });

    it('una tasa de 0% da tasa diaria 0', () => {
      expect(dailyRate(0)).toBe(0);
    });
  });

  describe('projectSavingsBalance', () => {
    it('tras un anio exacto el saldo crece segun la E.A.', () => {
      // 1.000.000 al 11.25% E.A. durante 365 dias.
      expect(projectSavingsBalance(1_000_000, 0.1125, 365)).toBe(1_112_500);
    });

    it('sin dias transcurridos devuelve el principal', () => {
      expect(projectSavingsBalance(500_000, 0.12, 0)).toBe(500_000);
    });
  });

  describe('savingsYield', () => {
    it('calcula solo el interes generado en el periodo', () => {
      expect(savingsYield(1_000_000, 0.1125, 365)).toBe(112_500);
    });
  });

  describe('projectCdt', () => {
    it('aplica la retencion del 4% sobre el interes y devuelve el valor neto', () => {
      const result = projectCdt(1_000_000, 0.13, 365, 0.04);
      expect(result.grossInterest).toBe(130_000);
      expect(result.withholding).toBe(5_200);
      expect(result.netInterest).toBe(124_800);
      expect(result.maturityValue).toBe(1_124_800);
    });

    it('proyecta un plazo parcial (180 dias) con capitalizacion compuesta', () => {
      const result = projectCdt(2_000_000, 0.10, 180, 0.04);
      // 2.000.000 * ((1.10)^(180/365) - 1)
      const expectedGross = 2_000_000 * (Math.pow(1.1, 180 / 365) - 1);
      expect(result.grossInterest).toBeCloseTo(expectedGross, 0);
      expect(result.netInterest).toBeCloseTo(expectedGross * 0.96, 0);
    });
  });

  describe('accrualSchedule', () => {
    it('genera la cantidad de puntos pedida y cierra en el valor final', () => {
      const points = accrualSchedule(1_000_000, 0.1125, 365, 12);
      expect(points).toHaveLength(12);
      expect(points[11].day).toBe(365);
      expect(points[11].value).toBe(1_112_500);
      expect(points[11].accruedInterest).toBe(112_500);
    });

    it('los puntos son crecientes en el tiempo', () => {
      const points = accrualSchedule(1_000_000, 0.12, 365, 6);
      for (let i = 1; i < points.length; i++) {
        expect(points[i].value).toBeGreaterThan(points[i - 1].value);
      }
    });

    it('devuelve vacio si no hay dias o pasos', () => {
      expect(accrualSchedule(1_000_000, 0.12, 0, 12)).toEqual([]);
      expect(accrualSchedule(1_000_000, 0.12, 365, 0)).toEqual([]);
    });
  });
});
