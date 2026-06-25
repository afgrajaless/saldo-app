import { computeCycleDates } from './card-dates';

describe('computeCycleDates', () => {
  it('corte y pago en el mismo mes cuando pago > corte', () => {
    const r = computeCycleDates(15, 5, '2026-03');
    expect(r.cutoffDate).toBe('2026-03-15');
    expect(r.paymentDueDate).toBe('2026-04-05'); // 5 <= 15 -> mes siguiente
  });

  it('pago en mes siguiente cuando pago <= corte', () => {
    const r = computeCycleDates(20, 10, '2026-03');
    expect(r.cutoffDate).toBe('2026-03-20');
    expect(r.paymentDueDate).toBe('2026-04-10');
  });

  it('ajusta dia 31 a fin de mes corto (febrero)', () => {
    const r = computeCycleDates(31, 28, '2026-02');
    expect(r.cutoffDate).toBe('2026-02-28'); // 2026 no bisiesto
    expect(r.paymentDueDate).toBe('2026-03-28');
  });
});
