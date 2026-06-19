import { addMonths } from './add-months';

describe('addMonths', () => {
  it('suma meses dentro del mismo anio', () => {
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonths('2026-01-15', 5)).toBe('2026-06-15');
  });

  it('cruza el cambio de anio', () => {
    expect(addMonths('2026-11-10', 3)).toBe('2027-02-10');
  });

  it('recorta el dia cuando el mes destino es mas corto', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28'); // 2026 no bisiesto
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29'); // 2024 bisiesto
  });

  it('devuelve la misma fecha al sumar 0 meses', () => {
    expect(addMonths('2026-03-20', 0)).toBe('2026-03-20');
  });
});
