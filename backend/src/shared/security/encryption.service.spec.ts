import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

/** Clave de prueba de 32 bytes en base64. */
const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

function makeService(key: string = TEST_KEY): EncryptionService {
  const config = { getOrThrow: jest.fn(() => key) } as unknown as ConfigService;
  return new EncryptionService(config);
}

describe('EncryptionService', () => {
  it('cifra y descifra de ida y vuelta', () => {
    const svc = makeService();
    const plain = 'of:banco-001:user-uuid';
    const enc = svc.encrypt(plain);

    expect(enc.startsWith('enc:v1:')).toBe(true);
    expect(enc).not.toContain(plain);
    expect(svc.decrypt(enc)).toBe(plain);
  });

  it('usa un IV aleatorio: el mismo texto cifra distinto cada vez', () => {
    const svc = makeService();
    expect(svc.encrypt('hola')).not.toBe(svc.encrypt('hola'));
  });

  it('trata como texto plano heredado lo que no tiene prefijo', () => {
    const svc = makeService();
    expect(svc.decrypt('texto-plano-viejo')).toBe('texto-plano-viejo');
  });

  it('preserva null en las variantes nullable', () => {
    const svc = makeService();
    expect(svc.encryptNullable(null)).toBeNull();
    expect(svc.decryptNullable(null)).toBeNull();
    expect(svc.decryptNullable(svc.encryptNullable('x'))).toBe('x');
  });

  it('falla si la clave no mide 32 bytes', () => {
    expect(() => makeService(Buffer.alloc(16, 1).toString('base64'))).toThrow();
  });

  it('falla al descifrar si el contenido fue manipulado (GCM detecta)', () => {
    const svc = makeService();
    const enc = svc.encrypt('integridad');
    const tampered = `${enc.slice(0, -2)}AA`;
    expect(() => svc.decrypt(tampered)).toThrow();
  });
});
