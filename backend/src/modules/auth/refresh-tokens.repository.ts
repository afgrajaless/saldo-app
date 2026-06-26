import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { refreshTokens } from '../../db/schema';

/** Fila de refresh token tal como se almacena en la base de datos. */
export type RefreshTokenRow = typeof refreshTokens.$inferSelect;

/**
 * Repositorio de refresh tokens. Persiste solo el HASH del token (nunca el token
 * en claro) y permite rotarlos y revocarlos (logout, robo, rotacion).
 */
@Injectable()
export class RefreshTokensRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Registra un refresh token emitido (su hash) para un usuario.
   * @param userId - UUID del usuario dueño del token.
   * @param tokenHash - Hash SHA-256 del refresh token.
   * @param expiresAt - Fecha de expiracion del token.
   * @returns La fila creada.
   */
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshTokenRow> {
    const [row] = await this.db
      .insert(refreshTokens)
      .values({ userId, tokenHash, expiresAt })
      .returning();
    return row;
  }

  /**
   * Busca un refresh token activo (no revocado y no expirado) por su hash.
   * @param tokenHash - Hash SHA-256 del refresh token presentado.
   * @returns La fila si esta vigente, o `undefined`.
   */
  async findActiveByHash(tokenHash: string): Promise<RefreshTokenRow | undefined> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, sql`now()`),
        ),
      )
      .limit(1);
    return row;
  }

  /**
   * Revoca un refresh token por id (marca revoked_at).
   * @param id - UUID de la fila del token.
   */
  async revoke(id: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, id));
  }

  /**
   * Revoca todos los refresh tokens vigentes de un usuario (logout global).
   * @param userId - UUID del usuario.
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  /**
   * Borra los refresh tokens ya expirados (filas muertas que no sirven para nada).
   * Se ejecuta periodicamente para que la tabla no crezca sin limite.
   * @returns Cantidad de filas eliminadas.
   */
  async deleteExpired(): Promise<number> {
    const deleted = await this.db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, sql`now()`))
      .returning({ id: refreshTokens.id });
    return deleted.length;
  }
}
