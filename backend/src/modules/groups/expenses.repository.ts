import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { sharedExpenses, sharedExpenseShares } from '../../db/schema';
import { MemberShare } from '../../domain/split/split-expense';

/** Fila de gasto compartido tal como se almacena. */
export type SharedExpenseRow = typeof sharedExpenses.$inferSelect;
/** Fila de parte de gasto tal como se almacena. */
export type SharedExpenseShareRow = typeof sharedExpenseShares.$inferSelect;

/** Datos para actualizar un gasto compartido (whitelist). */
export interface ExpenseUpdateFields {
  description?: string | null;
  amount?: string;
  occurredOn?: string;
  paidByMemberId?: string;
  splitMethod?: 'equal' | 'exact';
}

/**
 * Repositorio de gastos compartidos. Todas las consultas estan filtradas
 * por groupId para garantizar aislamiento entre grupos.
 */
@Injectable()
export class ExpensesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Inserta un gasto compartido y sus partes en una sola transaccion atomica.
   * @param groupId - UUID del grupo al que pertenece el gasto.
   * @param createdByUserId - UUID del usuario que registra el gasto.
   * @param expense - Datos del gasto (sin shares).
   * @param shares - Lista de partes por miembro.
   * @returns La fila del gasto creado.
   */
  async insertExpenseWithShares(
    groupId: string,
    createdByUserId: string,
    expense: {
      paidByMemberId: string;
      amount: number;
      description?: string;
      occurredOn: string;
      splitMethod: 'equal' | 'exact';
    },
    shares: MemberShare[],
  ): Promise<SharedExpenseRow> {
    return this.db.transaction(async (tx) => {
      const [newExpense] = await tx
        .insert(sharedExpenses)
        .values({
          groupId,
          paidByMemberId: expense.paidByMemberId,
          description: expense.description ?? null,
          amount: expense.amount.toFixed(2),
          occurredOn: expense.occurredOn,
          splitMethod: expense.splitMethod,
          createdByUserId,
        })
        .returning();

      await tx.insert(sharedExpenseShares).values(
        shares.map((s) => ({
          expenseId: newExpense.id,
          memberId: s.memberId,
          shareAmount: s.shareAmount.toFixed(2),
        })),
      );

      return newExpense;
    });
  }

  /**
   * Lista los gastos activos (no eliminados) de un grupo, ordenados por fecha descendente.
   * @param groupId - UUID del grupo.
   * @returns Lista de gastos activos del grupo.
   */
  async listExpenses(groupId: string): Promise<SharedExpenseRow[]> {
    return this.db
      .select()
      .from(sharedExpenses)
      .where(
        and(
          eq(sharedExpenses.groupId, groupId),
          isNull(sharedExpenses.deletedAt),
        ),
      )
      .orderBy(desc(sharedExpenses.occurredOn));
  }

  /**
   * Obtiene todas las partes de una lista de gastos en una sola consulta (evita N+1).
   * @param expenseIds - Lista de UUIDs de gastos a consultar.
   * @returns Lista de partes agrupadas. Si la lista esta vacia, devuelve [].
   */
  async findSharesForExpenses(expenseIds: string[]): Promise<SharedExpenseShareRow[]> {
    if (expenseIds.length === 0) return [];
    return this.db
      .select()
      .from(sharedExpenseShares)
      .where(inArray(sharedExpenseShares.expenseId, expenseIds));
  }

  /**
   * Busca un gasto activo por ID y grupo.
   * @param groupId - UUID del grupo al que debe pertenecer el gasto.
   * @param expenseId - UUID del gasto.
   * @returns La fila del gasto, o `undefined` si no existe o fue eliminado.
   */
  async findExpense(groupId: string, expenseId: string): Promise<SharedExpenseRow | undefined> {
    const [expense] = await this.db
      .select()
      .from(sharedExpenses)
      .where(
        and(
          eq(sharedExpenses.id, expenseId),
          eq(sharedExpenses.groupId, groupId),
          isNull(sharedExpenses.deletedAt),
        ),
      )
      .limit(1);
    return expense;
  }

  /**
   * Lista las partes de un gasto especifico.
   * @param expenseId - UUID del gasto.
   * @returns Lista de partes del gasto.
   */
  async findExpenseShares(expenseId: string): Promise<SharedExpenseShareRow[]> {
    return this.db
      .select()
      .from(sharedExpenseShares)
      .where(eq(sharedExpenseShares.expenseId, expenseId));
  }

  /**
   * Marca un gasto como eliminado (soft delete).
   * @param groupId - UUID del grupo al que pertenece el gasto.
   * @param expenseId - UUID del gasto a eliminar.
   * @throws NotFoundException si el gasto no existe en el grupo o ya fue eliminado.
   */
  async softDeleteExpense(groupId: string, expenseId: string): Promise<void> {
    // MVP: comprobacion fuera de transaccion; aceptable por bajo riesgo
    const existing = await this.findExpense(groupId, expenseId);
    if (!existing) {
      throw new NotFoundException('Gasto no encontrado en el grupo.');
    }
    await this.db
      .update(sharedExpenses)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(sharedExpenses.id, expenseId),
          eq(sharedExpenses.groupId, groupId),
          isNull(sharedExpenses.deletedAt),
        ),
      );
  }

  /**
   * Actualiza los campos editables de un gasto activo.
   * Las partes (shares) se eliminan y se recrean dentro de una transaccion cuando
   * se actualizan amount, splitMethod o shares.
   * @param groupId - UUID del grupo.
   * @param expenseId - UUID del gasto.
   * @param fields - Campos a actualizar (whitelist).
   * @param newShares - Si se proveen, reemplaza completamente las partes existentes.
   * @returns La fila actualizada.
   * @throws NotFoundException si el gasto no existe o fue eliminado.
   */
  async updateExpense(
    groupId: string,
    expenseId: string,
    fields: ExpenseUpdateFields,
    newShares?: MemberShare[],
  ): Promise<SharedExpenseRow> {
    // MVP: comprobacion fuera de transaccion; aceptable por bajo riesgo
    const existing = await this.findExpense(groupId, expenseId);
    if (!existing) {
      throw new NotFoundException('Gasto no encontrado en el grupo.');
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(sharedExpenses)
        .set(fields)
        .where(
          and(
            eq(sharedExpenses.id, expenseId),
            eq(sharedExpenses.groupId, groupId),
            isNull(sharedExpenses.deletedAt),
          ),
        )
        .returning();

      if (newShares && newShares.length > 0) {
        // Elimina todas las partes existentes y las reemplaza con las nuevas.
        await tx
          .delete(sharedExpenseShares)
          .where(eq(sharedExpenseShares.expenseId, expenseId));

        await tx.insert(sharedExpenseShares).values(
          newShares.map((s) => ({
            expenseId,
            memberId: s.memberId,
            shareAmount: s.shareAmount.toFixed(2),
          })),
        );
      }

      return updated;
    });
  }
}
