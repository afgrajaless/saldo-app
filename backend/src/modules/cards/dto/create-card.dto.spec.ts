import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCardDto } from './create-card.dto';

/** Construye un DTO de creacion de tarjeta valido. */
function validDto(overrides: Partial<Record<string, unknown>> = {}): CreateCardDto {
  return plainToInstance(CreateCardDto, {
    name: 'Visa Platinum',
    creditLimit: 5_000_000,
    statementDay: 15,
    paymentDay: 25,
    rotativoRateEa: 0.28,
    ...overrides,
  });
}

describe('CreateCardDto — validacion de dias', () => {
  it('acepta dias enteros validos (statementDay=15, paymentDay=25)', async () => {
    const errors = await validate(validDto());
    expect(errors).toHaveLength(0);
  });

  it('rechaza statementDay decimal (15.5) con error de validacion IsInt', async () => {
    const errors = await validate(validDto({ statementDay: 15.5 }));
    const field = errors.find((e) => e.property === 'statementDay');
    expect(field).toBeDefined();
    expect(Object.keys(field!.constraints ?? {})).toContain('isInt');
  });

  it('rechaza paymentDay decimal (25.9) con error de validacion IsInt', async () => {
    const errors = await validate(validDto({ paymentDay: 25.9 }));
    const field = errors.find((e) => e.property === 'paymentDay');
    expect(field).toBeDefined();
    expect(Object.keys(field!.constraints ?? {})).toContain('isInt');
  });

  it('rechaza statementDay fuera del rango (0)', async () => {
    const errors = await validate(validDto({ statementDay: 0 }));
    const field = errors.find((e) => e.property === 'statementDay');
    expect(field).toBeDefined();
  });

  it('rechaza paymentDay fuera del rango (32)', async () => {
    const errors = await validate(validDto({ paymentDay: 32 }));
    const field = errors.find((e) => e.property === 'paymentDay');
    expect(field).toBeDefined();
  });
});
