import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { categories, transactions } from '../../db/schema';

/** Fila de transaccion tal como se almacena. */
export type TransactionRow = typeof transactions.$inferSelect;
/** Valores para insertar una transaccion (sin id ni timestamp). */
export type NewTransactionValues = Omit<
  typeof transactions.$inferInsert,
  'id' | 'createdAt' | 'userId'
>;

/** Transaccion con los datos de su categoria embebidos. */
export interface TransactionWithCategory {
  id: string;
  categoryId: string;
  amount: string;
  occurredOn: string;
  description: string | null;
  createdAt: Date;
  categoryName: string;
  categoryType: string;
  categoryColor: string;
}

/** Suma de transacciones de una categoria en un periodo. */
export interface CategorySum {
  categoryId: string;
  total: string;
}

/**
 * Repositorio de transacciones (movimientos). Aislado por user_id. Las consultas
 * de un mes usan el rango [inicio, inicioSiguienteMes).
 */
@Injectable()
export class TransactionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Crea una transaccion del usuario.
   * @param userId - Dueno de la transaccion.
   * @param values - Datos de la transaccion.
   * @returns La transaccion creada.
   */
  async create(userId: string, values: NewTransactionValues): Promise<TransactionRow> {
    const [tx] = await this.db
      .insert(transactions)
      .values({ ...values, userId })
      .returning();
    return tx;
  }

  /**
   * Lista las transacciones de un mes con los datos de su categoria.
   * @param userId - Dueno de las transacciones.
   * @param start - Primer dia del mes (YYYY-MM-DD).
   * @param nextStart - Primer dia del mes siguiente (exclusivo).
   * @returns Las transacciones del periodo, mas recientes primero.
   */
  async findByUserAndMonth(
    userId: string,
    start: string,
    nextStart: string,
  ): Promise<TransactionWithCategory[]> {
    return this.db
      .select({
        id: transactions.id,
        categoryId: transactions.categoryId,
        amount: transactions.amount,
        occurredOn: transactions.occurredOn,
        description: transactions.description,
        createdAt: transactions.createdAt,
        categoryName: categories.name,
        categoryType: categories.type,
        categoryColor: categories.color,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredOn, start),
          lt(transactions.occurredOn, nextStart),
        ),
      )
      .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt));
  }

  /**
   * Suma el monto de las transacciones por categoria en un mes.
   * @param userId - Dueno de las transacciones.
   * @param start - Primer dia del mes.
   * @param nextStart - Primer dia del mes siguiente (exclusivo).
   * @returns Suma por categoria.
   */
  async sumByCategoryForMonth(
    userId: string,
    start: string,
    nextStart: string,
  ): Promise<CategorySum[]> {
    return this.db
      .select({
        categoryId: transactions.categoryId,
        total: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredOn, start),
          lt(transactions.occurredOn, nextStart),
        ),
      )
      .groupBy(transactions.categoryId);
  }

  /**
   * Busca una transaccion por id, garantizando que pertenezca al usuario.
   * @param id - UUID de la transaccion.
   * @param userId - Dueno esperado.
   * @returns La transaccion, o `undefined`.
   */
  async findByIdForUser(id: string, userId: string): Promise<TransactionRow | undefined> {
    const [tx] = await this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1);
    return tx;
  }

  /**
   * Elimina una transaccion del usuario.
   * @param id - UUID de la transaccion.
   * @param userId - Dueno esperado.
   * @returns El id eliminado, o `undefined`.
   */
  async delete(id: string, userId: string): Promise<string | undefined> {
    const [deleted] = await this.db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning({ id: transactions.id });
    return deleted?.id;
  }
}
