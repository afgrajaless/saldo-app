import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Database, DRIZZLE } from '../../db/database.module';
import { accounts, transfers } from '../../db/schema';

/** Fila de transferencia tal como se almacena. */
export type TransferRow = typeof transfers.$inferSelect;
/** Valores para insertar una transferencia (sin id ni timestamp). */
export type NewTransferValues = Omit<
  typeof transfers.$inferInsert,
  'id' | 'createdAt' | 'userId'
>;

/** Transferencia con los nombres de sus cuentas embebidos. */
export interface TransferWithAccounts {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  fromAccountName: string;
  toAccountName: string;
  amount: string;
  occurredOn: string;
  description: string | null;
}

/** Repositorio de transferencias entre cuentas. Aislado por user_id. */
@Injectable()
export class TransfersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Crea una transferencia del usuario.
   * @param userId - Dueno de la transferencia.
   * @param values - Datos de la transferencia.
   * @returns La transferencia creada.
   */
  async create(userId: string, values: NewTransferValues): Promise<TransferRow> {
    const [transfer] = await this.db
      .insert(transfers)
      .values({ ...values, userId })
      .returning();
    return transfer;
  }

  /**
   * Lista las transferencias de un mes con los nombres de sus cuentas.
   * @param userId - Dueno de las transferencias.
   * @param start - Primer dia del mes (YYYY-MM-DD).
   * @param nextStart - Primer dia del mes siguiente (exclusivo).
   * @returns Las transferencias del periodo, mas recientes primero.
   */
  async findByUserAndMonth(
    userId: string,
    start: string,
    nextStart: string,
  ): Promise<TransferWithAccounts[]> {
    const fromAccount = alias(accounts, 'from_account');
    const toAccount = alias(accounts, 'to_account');
    return this.db
      .select({
        id: transfers.id,
        fromAccountId: transfers.fromAccountId,
        toAccountId: transfers.toAccountId,
        fromAccountName: fromAccount.name,
        toAccountName: toAccount.name,
        amount: transfers.amount,
        occurredOn: transfers.occurredOn,
        description: transfers.description,
      })
      .from(transfers)
      .innerJoin(fromAccount, eq(transfers.fromAccountId, fromAccount.id))
      .innerJoin(toAccount, eq(transfers.toAccountId, toAccount.id))
      .where(
        and(
          eq(transfers.userId, userId),
          gte(transfers.occurredOn, start),
          lt(transfers.occurredOn, nextStart),
        ),
      )
      .orderBy(desc(transfers.occurredOn), desc(transfers.createdAt));
  }

  /**
   * Elimina una transferencia del usuario.
   * @param id - UUID de la transferencia.
   * @param userId - Dueno esperado.
   * @returns El id eliminado, o `undefined`.
   */
  async delete(id: string, userId: string): Promise<string | undefined> {
    const [deleted] = await this.db
      .delete(transfers)
      .where(and(eq(transfers.id, id), eq(transfers.userId, userId)))
      .returning({ id: transfers.id });
    return deleted?.id;
  }
}
