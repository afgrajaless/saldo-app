import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { settlements, sharedExpenses, sharedExpenseShares } from '../../db/schema';

/**
 * Dato crudo de una parte de gasto (share), como viene de la BD.
 * shareAmount es string porque Drizzle expone NUMERIC como string.
 */
export interface RawShare {
  memberId: string;
  shareAmount: string;
  status: 'confirmed' | 'pending' | 'disputed';
}

/**
 * Dato crudo de un gasto con su lista de partes.
 * Construido en memoria agrupando el JOIN de sharedExpenses + sharedExpenseShares.
 */
export interface RawExpenseWithShares {
  paidByMemberId: string;
  shares: RawShare[];
}

/** Dato crudo de un settlement entre dos miembros. */
export interface RawSettlement {
  fromMemberId: string;
  toMemberId: string;
  amount: string;
}

/**
 * Repositorio de datos de saldo del grupo.
 * Lee gastos vivos con sus partes y settlements para que el servicio
 * calcule los netos con el dominio.
 */
@Injectable()
export class BalanceRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Obtiene todos los gastos activos (no eliminados) de un grupo junto con sus partes (shares).
   * Los datos se devuelven crudos para que el dominio realice el calculo.
   * @param groupId - UUID del grupo.
   * @returns Lista de gastos con su pagador y la lista de partes por miembro.
   */
  async findExpensesWithShares(groupId: string): Promise<RawExpenseWithShares[]> {
    // Un solo JOIN: gastos vivos + sus shares en una consulta.
    const rows = await this.db
      .select({
        expenseId: sharedExpenses.id,
        paidByMemberId: sharedExpenses.paidByMemberId,
        memberId: sharedExpenseShares.memberId,
        shareAmount: sharedExpenseShares.shareAmount,
        status: sharedExpenseShares.status,
      })
      .from(sharedExpenses)
      .innerJoin(
        sharedExpenseShares,
        eq(sharedExpenseShares.expenseId, sharedExpenses.id),
      )
      .where(
        and(
          eq(sharedExpenses.groupId, groupId),
          isNull(sharedExpenses.deletedAt),
        ),
      );

    // Agrupa las partes por expenseId en memoria para evitar N+1.
    const byExpense = new Map<string, RawExpenseWithShares>();
    for (const row of rows) {
      if (!byExpense.has(row.expenseId)) {
        byExpense.set(row.expenseId, {
          paidByMemberId: row.paidByMemberId,
          shares: [],
        });
      }
      byExpense.get(row.expenseId)!.shares.push({
        memberId: row.memberId,
        shareAmount: row.shareAmount,
        status: row.status,
      });
    }

    return Array.from(byExpense.values());
  }

  /**
   * Obtiene todos los settlements del grupo.
   * @param groupId - UUID del grupo.
   * @returns Lista de settlements con pagador, receptor y monto (como string).
   */
  async findSettlements(groupId: string): Promise<RawSettlement[]> {
    return this.db
      .select({
        fromMemberId: settlements.fromMemberId,
        toMemberId: settlements.toMemberId,
        amount: settlements.amount,
      })
      .from(settlements)
      .where(eq(settlements.groupId, groupId));
  }

  /**
   * Cuenta cuántas partes (shares) de un miembro específico están en estado 'pending' dentro del grupo.
   * Solo cuenta shares de gastos vivos (no eliminados).
   * @param groupId - UUID del grupo.
   * @param memberId - UUID del miembro cuyas shares pendientes se quieren contar.
   * @returns Número de shares pendientes del miembro en el grupo.
   */
  async countMyPendingShares(groupId: string, memberId: string): Promise<number> {
    const result = await this.db
      .select({ total: count() })
      .from(sharedExpenseShares)
      .innerJoin(sharedExpenses, eq(sharedExpenseShares.expenseId, sharedExpenses.id))
      .where(
        and(
          eq(sharedExpenses.groupId, groupId),
          isNull(sharedExpenses.deletedAt),
          eq(sharedExpenseShares.memberId, memberId),
          eq(sharedExpenseShares.status, 'pending'),
        ),
      );
    return result[0]?.total ?? 0;
  }
}
