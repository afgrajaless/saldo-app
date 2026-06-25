import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { accounts, cardInstallmentItems, cardInstallmentPlans, categories, transactions } from '../../db/schema';
import { InstallmentItem } from '../../domain/card/card-installment';

/** Fila de transaccion tal como se almacena. */
export type TransactionRow = typeof transactions.$inferSelect;
/** Valores para insertar una transaccion (sin id ni timestamp). */
export type NewTransactionValues = Omit<
  typeof transactions.$inferInsert,
  'id' | 'createdAt' | 'userId'
>;

/** Transaccion con los datos de su categoria (y cuenta, si tiene) embebidos. */
export interface TransactionWithCategory {
  id: string;
  categoryId: string;
  accountId: string | null;
  amount: string;
  occurredOn: string;
  description: string | null;
  createdAt: Date;
  categoryName: string;
  categoryType: string;
  categoryColor: string;
  accountName: string | null;
}

/** Suma de transacciones de una categoria en un periodo. */
export interface CategorySum {
  categoryId: string;
  total: string;
}

/**
 * Datos del plan diferido que se persiste junto con la transaccion.
 */
export interface InstallmentPlanPayload {
  /** ID de la cuenta (tarjeta de credito). */
  accountId: string;
  /** Capital total diferido. */
  principal: number;
  /** Numero total de cuotas. */
  numberOfInstallments: number;
  /** Tasa mensual efectiva como fraccion decimal. */
  monthlyRate: number;
  /** Fecha de inicio del plan (occurredOn de la transaccion). */
  startDate: string;
  /** Cuotas generadas por buildInstallmentSchedule. */
  items: InstallmentItem[];
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
   * Inserta en una sola transaccion atomica: el gasto, el plan diferido y sus
   * cuotas individuales. Si cualquier paso falla, todo se revierte.
   * @param userId - Dueno del movimiento.
   * @param values - Datos de la transaccion (sin id ni timestamp).
   * @param plan - Plan diferido con el cronograma de cuotas generado por el dominio.
   * @returns La transaccion creada.
   */
  async createTransactionWithPlan(
    userId: string,
    values: NewTransactionValues,
    plan: InstallmentPlanPayload,
  ): Promise<TransactionRow> {
    return this.db.transaction(async (tx) => {
      // 1. Inserta el gasto.
      const [txRow] = await tx
        .insert(transactions)
        .values({ ...values, userId })
        .returning();

      // 2. Inserta el plan diferido vinculado a la transaccion recien creada.
      const [planRow] = await tx
        .insert(cardInstallmentPlans)
        .values({
          accountId: plan.accountId,
          transactionId: txRow.id,
          principal: plan.principal.toFixed(2),
          numberOfInstallments: plan.numberOfInstallments,
          monthlyRate: plan.monthlyRate.toFixed(6),
          startDate: plan.startDate,
          status: 'active',
        })
        .returning();

      // 3. Inserta cada cuota del cronograma.
      await tx.insert(cardInstallmentItems).values(
        plan.items.map((item) => ({
          planId: planRow.id,
          number: item.number,
          dueOn: item.dueOn,
          principal: item.principal.toFixed(2),
          interest: item.interest.toFixed(2),
          balance: item.balance.toFixed(2),
        })),
      );

      return txRow;
    });
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
        accountId: transactions.accountId,
        amount: transactions.amount,
        occurredOn: transactions.occurredOn,
        description: transactions.description,
        createdAt: transactions.createdAt,
        categoryName: categories.name,
        categoryType: categories.type,
        categoryColor: categories.color,
        accountName: accounts.name,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
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
