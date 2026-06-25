import { buildInstallmentSchedule } from './card-installment';
import { roundMoney } from '../shared/money';

describe('buildInstallmentSchedule', () => {
  const BASE_INPUT = {
    principal: 1_200_000,
    monthlyRate: 0.02,
    numberOfInstallments: 3,
    startDate: '2026-03-15',
  };

  it('genera el numero correcto de cuotas', () => {
    const items = buildInstallmentSchedule(BASE_INPUT);
    expect(items.length).toBe(3);
  });

  it('la suma de capital amortizado es igual al principal', () => {
    const items = buildInstallmentSchedule(BASE_INPUT);
    const sumPrincipal = items.reduce((acc, item) => acc + item.principal, 0);
    expect(roundMoney(sumPrincipal)).toBe(1_200_000);
  });

  it('dueOn de la primera cuota es un mes despues de startDate', () => {
    const items = buildInstallmentSchedule(BASE_INPUT);
    expect(items[0].dueOn).toBe('2026-04-15');
  });

  it('dueOn de la segunda cuota es dos meses despues de startDate', () => {
    const items = buildInstallmentSchedule(BASE_INPUT);
    expect(items[1].dueOn).toBe('2026-05-15');
  });

  it('dueOn de la tercera cuota es tres meses despues de startDate', () => {
    const items = buildInstallmentSchedule(BASE_INPUT);
    expect(items[2].dueOn).toBe('2026-06-15');
  });

  it('los numeros de cuota van de 1 a N en orden', () => {
    const items = buildInstallmentSchedule(BASE_INPUT);
    expect(items.map((i) => i.number)).toEqual([1, 2, 3]);
  });

  it('el saldo de la ultima cuota es cero', () => {
    const items = buildInstallmentSchedule(BASE_INPUT);
    expect(items[items.length - 1].balance).toBe(0);
  });

  it('el interes del primer periodo es correcto (principal * monthlyRate)', () => {
    const items = buildInstallmentSchedule(BASE_INPUT);
    // Interes primer periodo = 1_200_000 * 0.02 = 24_000
    expect(items[0].interest).toBe(24_000);
  });

  it('funciona con tasa cero (cuota plana)', () => {
    const items = buildInstallmentSchedule({ ...BASE_INPUT, monthlyRate: 0 });
    const sumPrincipal = items.reduce((acc, item) => acc + item.principal, 0);
    expect(roundMoney(sumPrincipal)).toBe(1_200_000);
    expect(items[0].interest).toBe(0);
  });

  it('ajusta el dia cuando el mes destino tiene menos dias (31 de enero → febrero)', () => {
    const items = buildInstallmentSchedule({
      principal: 600_000,
      monthlyRate: 0.015,
      numberOfInstallments: 2,
      startDate: '2026-01-31',
    });
    // Enero 31 + 1 mes = 28 de febrero (2026 no es bisiesto)
    expect(items[0].dueOn).toBe('2026-02-28');
    expect(items[1].dueOn).toBe('2026-03-31');
  });
});
