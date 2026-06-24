import { splitEqual, validateExact } from './split-expense';

describe('splitEqual', () => {
  it('reparte en partes iguales exactas', () => {
    const shares = splitEqual(90000, ['a', 'b', 'c']);
    expect(shares).toEqual([
      { memberId: 'a', shareAmount: 30000 },
      { memberId: 'b', shareAmount: 30000 },
      { memberId: 'c', shareAmount: 30000 },
    ]);
  });

  it('asigna el residuo de centavos de forma determinista (suma = total)', () => {
    const shares = splitEqual(100, ['a', 'b', 'c']); // 100/3 = 33.33...
    const sum = shares.reduce((s, x) => s + x.shareAmount, 0);
    expect(sum).toBe(100);
    // El residuo (0.01) cae en el primero.
    expect(shares[0].shareAmount).toBe(33.34);
    expect(shares[1].shareAmount).toBe(33.33);
    expect(shares[2].shareAmount).toBe(33.33);
  });

  it('rechaza lista vacia de participantes', () => {
    expect(() => splitEqual(100, [])).toThrow();
  });

  it('rechaza monto cero', () => {
    expect(() => splitEqual(0, ['a'])).toThrow('El monto total debe ser mayor que cero.');
  });

  it('rechaza monto negativo', () => {
    expect(() => splitEqual(-100, ['a', 'b'])).toThrow('El monto total debe ser mayor que cero.');
  });
});

describe('validateExact', () => {
  it('acepta cuando la suma de montos es igual al total', () => {
    expect(() =>
      validateExact(100, [
        { memberId: 'a', shareAmount: 60 },
        { memberId: 'b', shareAmount: 40 },
      ]),
    ).not.toThrow();
  });

  it('rechaza cuando la suma no coincide', () => {
    expect(() =>
      validateExact(100, [
        { memberId: 'a', shareAmount: 60 },
        { memberId: 'b', shareAmount: 30 },
      ]),
    ).toThrow();
  });

  it('rechaza montos no positivos', () => {
    expect(() =>
      validateExact(100, [
        { memberId: 'a', shareAmount: 100 },
        { memberId: 'b', shareAmount: 0 },
      ]),
    ).toThrow();
  });

  it('rechaza monto total cero', () => {
    expect(() =>
      validateExact(0, [
        { memberId: 'a', shareAmount: 0 },
      ]),
    ).toThrow('El monto total debe ser mayor que cero.');
  });

  it('rechaza lista vacia de participantes', () => {
    expect(() => validateExact(100, [])).toThrow('Se requiere al menos un participante.');
  });
});
