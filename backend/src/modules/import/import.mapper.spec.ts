import { mapRows } from './import.mapper';

/** Encabezado del archivo de movimientos. */
const HEADER = [
  'Según un período',
  'Cuentas',
  'Categoría',
  'Subcategorías',
  'Nota',
  'COP',
  'Ingreso/Gasto',
  'Descripción',
  'Importe',
  'Moneda',
  'Cuentas',
];

describe('mapRows', () => {
  it('mapea gastos e ingresos con cuenta, categoria y descripcion', () => {
    const rows = [
      HEADER,
      [new Date(2025, 9, 9), 'Nequi', '🍜 Comida', 'Comida', 'Almuerzo', 10000, 'Gastos', null, 10000, 'COP', 10000],
      [new Date(2025, 8, 12), 'Nequi', '💰 Salario', null, 'Pago Agosto', 4658000, 'Ingreso', null, 4658000, 'COP', 4658000],
    ];

    const result = mapRows(rows);

    expect(result.transactions).toHaveLength(2);
    const gasto = result.transactions[0];
    expect(gasto.type).toBe('expense');
    expect(gasto.categoryName).toBe('🍜 Comida');
    expect(gasto.accountName).toBe('Nequi');
    expect(gasto.amount).toBe(10000);
    expect(gasto.occurredOn).toBe('2025-10-09');
    expect(gasto.description).toBe('Comida · Almuerzo');
    expect(result.transactions[1].type).toBe('income');
  });

  it('convierte un par gastado/ingresado en una sola transferencia', () => {
    const rows = [
      HEADER,
      [new Date(2025, 9, 7), 'Nequi', 'Dinero en efectivo', null, null, 50000, 'Dinero gastado', null, 50000, 'COP', 50000],
      [new Date(2025, 9, 7), 'Dinero en efectivo', 'Nequi', null, null, 50000, 'Dinero ingresado', null, 50000, 'COP', 50000],
    ];

    const result = mapRows(rows);

    expect(result.transfers).toHaveLength(1);
    expect(result.transfers[0]).toMatchObject({
      fromName: 'Nequi',
      toName: 'Dinero en efectivo',
      amount: 50000,
      occurredOn: '2025-10-07',
    });
    expect(result.skipped.transferCounterpart).toBe(1);
    expect(result.transactions).toHaveLength(0);
  });

  it('omite filas de resumen y transferencias a la misma cuenta', () => {
    const rows = [
      HEADER,
      [new Date(2025, 9, 1), 'Nequi', 'Nequi', null, null, 199609, 'Dinero gastado', null, 199609, 'COP', 199609],
      ['', '', '', '', '', 0, 'Saldo de Despesas', null, 0, 'COP', 0],
    ];

    const result = mapRows(rows);

    expect(result.transfers).toHaveLength(0);
    expect(result.skipped.sameAccountTransfer).toBe(1);
    expect(result.skipped.summary).toBe(1);
  });

  it('omite filas invalidas (sin monto)', () => {
    const rows = [
      HEADER,
      [new Date(2025, 9, 9), 'Nequi', 'Comida', null, null, null, 'Gastos', null, null, 'COP', null],
    ];

    const result = mapRows(rows);

    expect(result.transactions).toHaveLength(0);
    expect(result.skipped.invalid).toBe(1);
  });

  it('parsea montos en texto con separadores de miles', () => {
    const rows = [
      HEADER,
      ['2025-10-09', 'Nequi', 'Arriendo', null, null, '2.400.000', 'Gastos', null, '2.400.000', 'COP', '2.400.000'],
    ];

    const result = mapRows(rows);

    expect(result.transactions[0].amount).toBe(2400000);
    expect(result.transactions[0].occurredOn).toBe('2025-10-09');
  });
});
