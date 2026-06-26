import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Prefijo que marca un valor cifrado (permite distinguir texto plano heredado). */
const PREFIX = 'enc:v1:';
/** Tamaño del vector de inicializacion (IV) para AES-GCM, en bytes. */
const IV_BYTES = 12;
/** Tamaño del tag de autenticacion de AES-GCM, en bytes. */
const TAG_BYTES = 16;

/**
 * Cifrado en reposo de campos sensibles con AES-256-GCM.
 *
 * Formato de salida: `enc:v1:<base64(iv | authTag | ciphertext)>`. La clave
 * (32 bytes) se lee de la variable de entorno ENCRYPTION_KEY (base64).
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.getOrThrow<string>('ENCRYPTION_KEY');
    this.key = Buffer.from(raw, 'base64');
    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY debe ser de 32 bytes codificados en base64.');
    }
  }

  /**
   * Cifra un texto plano y devuelve el sobre `enc:v1:...`.
   * @param plain - Texto a cifrar.
   * @returns El valor cifrado con su prefijo de version.
   */
  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
  }

  /**
   * Descifra un valor cifrado. Si no tiene el prefijo `enc:v1:`, se asume texto
   * plano heredado (anterior al cifrado) y se devuelve sin cambios.
   * @param value - Valor a descifrar (cifrado o texto plano).
   * @returns El texto plano.
   */
  decrypt(value: string): string {
    if (!value.startsWith(PREFIX)) {
      return value; // texto plano heredado: compatibilidad hacia atras
    }
    const buf = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = buf.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /**
   * Cifra un valor que puede ser nulo (preserva null).
   * @param value - Texto o null.
   * @returns El valor cifrado, o null.
   */
  encryptNullable(value: string | null): string | null {
    return value == null ? value : this.encrypt(value);
  }

  /**
   * Descifra un valor que puede ser nulo (preserva null).
   * @param value - Valor cifrado/plano, o null.
   * @returns El texto plano, o null.
   */
  decryptNullable(value: string | null): string | null {
    return value == null ? value : this.decrypt(value);
  }
}
