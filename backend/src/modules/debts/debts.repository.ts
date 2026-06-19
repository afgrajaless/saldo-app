import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { debts, installments } from '../../db/schema';
import { InstallmentSeed } from './installment-schedule.factory';

/** Fila de deuda tal como se almacena. */
export type DebtRow = typeof debts.$inferSelect;
/** Fila de cuota tal como se almacena. */
export type InstallmentRow = typeof installments.$inferSelect;
/** Valores para insertar una deuda (sin id ni timestamps). */
export type NewDebtValues = Omit<
  typeof debts.$inferInsert,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'userId'
>;
/** Campos actualizables de una deuda (whitelist). */
export interface DebtUpdateFields {
  creditor?: string;
  status?: DebtRow['status'];
}

/**
 * Repositorio de deudas. Todas las consultas estan aisladas por user_id y
 * excluyen las deudas con soft delete (deleted_at IS NULL).
 */
@Injectable()
export class DebtsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Crea una deuda y su cronograma de cuotas en una sola transaccion.
   * @param userId - Dueno de la deuda.
   * @param values - Datos de la deuda.
   * @param schedule - Cuotas a insertar.
   * @returns La deuda creada.
   */
  async createWithSchedule(
    userId: string,
    values: NewDebtValues,
    schedule: InstallmentSeed[],
  ): Promise<DebtRow> {
    return this.db.transaction(async (tx) => {
      const [debt] = await tx
        .insert(debts)
        .values({ ...values, userId })
        .returning();
      if (schedule.length > 0) {
        await tx
          .insert(installments)
          .values(schedule.map((row) => ({ ...row, debtId: debt.id })));
      }
      return debt;
    });
  }

  /**
   * Lista las deudas vivas de un usuario, mas recientes primero.
   * @param userId - Dueno de las deudas.
   * @returns Las deudas no eliminadas del usuario.
   */
  async findAllByUser(userId: string): Promise<DebtRow[]> {
    return this.db
      .select()
      .from(debts)
      .where(and(eq(debts.userId, userId), isNull(debts.deletedAt)))
      .orderBy(desc(debts.createdAt));
  }

  /**
   * Busca una deuda viva por id, garantizando que pertenezca al usuario.
   * @param id - UUID de la deuda.
   * @param userId - Dueno esperado.
   * @returns La deuda si existe y es del usuario, o `undefined`.
   */
  async findByIdForUser(id: string, userId: string): Promise<DebtRow | undefined> {
    const [debt] = await this.db
      .select()
      .from(debts)
      .where(and(eq(debts.id, id), eq(debts.userId, userId), isNull(debts.deletedAt)))
      .limit(1);
    return debt;
  }

  /**
   * Obtiene el cronograma (cuotas) de una deuda, ordenado por numero.
   * @param debtId - UUID de la deuda.
   * @returns Las cuotas de la deuda.
   */
  async findInstallments(debtId: string): Promise<InstallmentRow[]> {
    return this.db
      .select()
      .from(installments)
      .where(eq(installments.debtId, debtId))
      .orderBy(installments.number);
  }

  /**
   * Actualiza campos permitidos de una deuda del usuario.
   * @param id - UUID de la deuda.
   * @param userId - Dueno esperado.
   * @param fields - Campos a actualizar (creditor, status).
   * @returns La deuda actualizada, o `undefined` si no existe/ no es del usuario.
   */
  async update(
    id: string,
    userId: string,
    fields: DebtUpdateFields,
  ): Promise<DebtRow | undefined> {
    const [debt] = await this.db
      .update(debts)
      .set(fields)
      .where(and(eq(debts.id, id), eq(debts.userId, userId), isNull(debts.deletedAt)))
      .returning();
    return debt;
  }

  /**
   * Marca una deuda como eliminada (soft delete).
   * @param id - UUID de la deuda.
   * @param userId - Dueno esperado.
   * @returns El id eliminado, o `undefined` si no existia.
   */
  async softDelete(id: string, userId: string): Promise<string | undefined> {
    const [deleted] = await this.db
      .update(debts)
      .set({ deletedAt: new Date() })
      .where(and(eq(debts.id, id), eq(debts.userId, userId), isNull(debts.deletedAt)))
      .returning({ id: debts.id });
    return deleted?.id;
  }
}
