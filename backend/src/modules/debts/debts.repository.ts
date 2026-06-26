import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { debts, installments } from '../../db/schema';
import { EncryptionService } from '../../shared/security/encryption.service';
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
 * excluyen las deudas con soft delete (deleted_at IS NULL). El acreedor
 * (`creditor`, puede ser el nombre de una persona) se cifra en reposo.
 */
@Injectable()
export class DebtsRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Crea una deuda y su cronograma de cuotas en una sola transaccion. El
   * acreedor se cifra antes de persistirlo.
   * @param userId - Dueno de la deuda.
   * @param values - Datos de la deuda.
   * @param schedule - Cuotas a insertar.
   * @returns La deuda creada (con el acreedor descifrado).
   */
  async createWithSchedule(
    userId: string,
    values: NewDebtValues,
    schedule: InstallmentSeed[],
  ): Promise<DebtRow> {
    const debt = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(debts)
        .values({ ...values, userId, creditor: this.encryption.encrypt(values.creditor) })
        .returning();
      if (schedule.length > 0) {
        await tx
          .insert(installments)
          .values(schedule.map((row) => ({ ...row, debtId: created.id })));
      }
      return created;
    });
    return this.decryptRow(debt);
  }

  /**
   * Lista las deudas vivas de un usuario, mas recientes primero.
   * @param userId - Dueno de las deudas.
   * @returns Las deudas no eliminadas del usuario.
   */
  async findAllByUser(userId: string): Promise<DebtRow[]> {
    const rows = await this.db
      .select()
      .from(debts)
      .where(and(eq(debts.userId, userId), isNull(debts.deletedAt)))
      .orderBy(desc(debts.createdAt));
    return rows.map((row) => this.decryptRow(row));
  }

  /**
   * Trae las cuotas de todas las deudas vivas de un usuario en una sola query,
   * para calcular metricas (saldo, cuota) sin caer en N+1.
   * @param userId - Dueno de las deudas.
   * @returns Las cuotas (con su debtId) de las deudas no eliminadas, por numero.
   */
  async findInstallmentsByUser(userId: string): Promise<InstallmentRow[]> {
    return this.db
      .select({
        id: installments.id,
        debtId: installments.debtId,
        number: installments.number,
        dueDate: installments.dueDate,
        principalPortion: installments.principalPortion,
        interestPortion: installments.interestPortion,
        insurancePortion: installments.insurancePortion,
        totalAmount: installments.totalAmount,
        remainingBalance: installments.remainingBalance,
        status: installments.status,
      })
      .from(installments)
      .innerJoin(debts, eq(installments.debtId, debts.id))
      .where(and(eq(debts.userId, userId), isNull(debts.deletedAt)))
      .orderBy(installments.debtId, installments.number);
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
    return debt ? this.decryptRow(debt) : undefined;
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
    const toSet =
      fields.creditor !== undefined
        ? { ...fields, creditor: this.encryption.encrypt(fields.creditor) }
        : fields;
    const [debt] = await this.db
      .update(debts)
      .set(toSet)
      .where(and(eq(debts.id, id), eq(debts.userId, userId), isNull(debts.deletedAt)))
      .returning();
    return debt ? this.decryptRow(debt) : undefined;
  }

  /**
   * Descifra el acreedor de una fila de deuda.
   * @param debt - Fila cruda de la BD.
   * @returns La fila con el acreedor en texto plano.
   */
  private decryptRow(debt: DebtRow): DebtRow {
    return { ...debt, creditor: this.encryption.decrypt(debt.creditor) };
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
