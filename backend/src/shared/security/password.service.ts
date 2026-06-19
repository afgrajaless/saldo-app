import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Servicio de hashing de contrasenas con Argon2id.
 *
 * Aisla la dependencia de Argon2 detras de una interfaz simple, lo que facilita
 * las pruebas (se puede mockear) y un eventual cambio de algoritmo.
 */
@Injectable()
export class PasswordService {
  /**
   * Genera el hash Argon2id de una contrasena en texto plano.
   * @param plain - Contrasena en texto plano.
   * @returns El hash resultante (incluye sal y parametros).
   */
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  /**
   * Verifica una contrasena en texto plano contra su hash almacenado.
   * @param hash - Hash Argon2 almacenado.
   * @param plain - Contrasena en texto plano a verificar.
   * @returns `true` si coinciden, `false` en caso contrario.
   */
  async verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
