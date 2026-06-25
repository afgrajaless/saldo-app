import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { accountRates, accountSnapshots, accounts, cdtTerms, transactions, transfers } from '../../db/schema';

/** Fila de cuenta tal como se almacena. */
export type AccountRow = typeof accounts.$inferSelect;
/** Fila de snapshot de saldo. */
export type SnapshotRow = typeof accountSnapshots.$inferSelect;
/** Fila de condiciones de un CDT. */
export type CdtTermsRow = typeof cdtTerms.$inferSelect;
/** Valores para crear/actualizar las condiciones de un CDT. */
export type CdtTermsValues = Omit<
  typeof cdtTerms.$inferInsert,
  'id' | 'createdAt' | 'userId' | 'accountId'
>;
/** Valores para insertar una cuenta (sin id ni timestamps). */
export type NewAccountValues = Omit<
  typeof accounts.$inferInsert,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'userId'
>;
/** Campos actualizables de una cuenta (whitelist). */
export interface AccountUpdateFields {
  name?: string;
  color?: string;
}

/**
 * Repositorio de cuentas. Todas las consultas estan aisladas por user_id y
 * excluyen las cuentas con soft delete.
 */
@Injectable()
export class AccountsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Crea una cuenta del usuario.
   * @param userId - Dueno de la cuenta.
   * @param values - Datos de la cuenta.
   * @returns La cuenta creada.
   */
  async create(userId: string, values: NewAccountValues): Promise<AccountRow> {
    const [account] = await this.db
      .insert(accounts)
      .values({ ...values, userId })
      .returning();
    return account;
  }

  /**
   * Lista las cuentas vivas del usuario, mas recientes primero.
   * @param userId - Dueno de las cuentas.
   * @returns Las cuentas no eliminadas.
   */
  async findAllByUser(userId: string): Promise<AccountRow[]> {
    return this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), isNull(accounts.deletedAt)))
      .orderBy(desc(accounts.createdAt));
  }

  /**
   * Busca una cuenta viva por id, garantizando que pertenezca al usuario.
   * @param id - UUID de la cuenta.
   * @param userId - Dueno esperado.
   * @returns La cuenta, o `undefined`.
   */
  async findByIdForUser(id: string, userId: string): Promise<AccountRow | undefined> {
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId), isNull(accounts.deletedAt)))
      .limit(1);
    return account;
  }

  /**
   * Busca una cuenta viva del usuario por nombre (sin distinguir mayusculas).
   * Sirve para evitar duplicados y para resolver cuentas al importar.
   * @param userId - Dueno de la cuenta.
   * @param name - Nombre a buscar.
   * @returns La cuenta si existe, o `undefined`.
   */
  async findByName(userId: string, name: string): Promise<AccountRow | undefined> {
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          sql`lower(${accounts.name}) = ${name.toLowerCase()}`,
          isNull(accounts.deletedAt),
        ),
      )
      .limit(1);
    return account;
  }

  /**
   * Fija el tipo de rendimiento y la tasa E.A. vigente de una cuenta.
   * @param id - UUID de la cuenta.
   * @param userId - Dueno esperado.
   * @param yieldType - Tipo de rendimiento (none, savings, cdt).
   * @param effectiveAnnualRate - Tasa E.A. (fraccion) o null.
   * @returns La cuenta actualizada, o `undefined`.
   */
  async setYield(
    id: string,
    userId: string,
    yieldType: AccountRow['yieldType'],
    effectiveAnnualRate: string | null,
  ): Promise<AccountRow | undefined> {
    const [account] = await this.db
      .update(accounts)
      .set({ yieldType, effectiveAnnualRate })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId), isNull(accounts.deletedAt)))
      .returning();
    return account;
  }

  /**
   * Registra una tasa E.A. en el historial de una cuenta.
   * @param accountId - UUID de la cuenta.
   * @param effectiveAnnualRate - Tasa E.A. (fraccion decimal).
   * @param validFrom - Fecha desde la que aplica (YYYY-MM-DD).
   */
  async insertRate(
    accountId: string,
    effectiveAnnualRate: string,
    validFrom: string,
  ): Promise<void> {
    await this.db.insert(accountRates).values({ accountId, effectiveAnnualRate, validFrom });
  }

  /**
   * Lista el historial de tasas de una cuenta, mas reciente primero.
   * @param accountId - UUID de la cuenta.
   * @returns Las tasas registradas.
   */
  async listRates(accountId: string): Promise<(typeof accountRates.$inferSelect)[]> {
    return this.db
      .select()
      .from(accountRates)
      .where(eq(accountRates.accountId, accountId))
      .orderBy(desc(accountRates.validFrom));
  }

  /**
   * Crea o reemplaza las condiciones del CDT de una cuenta.
   * @param accountId - UUID de la cuenta.
   * @param userId - Dueno de la cuenta.
   * @param values - Condiciones del CDT.
   * @returns Las condiciones guardadas.
   */
  async upsertCdtTerms(
    accountId: string,
    userId: string,
    values: CdtTermsValues,
  ): Promise<CdtTermsRow> {
    const [row] = await this.db
      .insert(cdtTerms)
      .values({ ...values, accountId, userId })
      .onConflictDoUpdate({ target: cdtTerms.accountId, set: values })
      .returning();
    return row;
  }

  /**
   * Obtiene las condiciones del CDT de una cuenta.
   * @param accountId - UUID de la cuenta.
   * @returns Las condiciones, o `undefined`.
   */
  async getCdtTerms(accountId: string): Promise<CdtTermsRow | undefined> {
    const [row] = await this.db
      .select()
      .from(cdtTerms)
      .where(eq(cdtTerms.accountId, accountId))
      .limit(1);
    return row;
  }

  /**
   * Inserta o reemplaza el snapshot de saldo de una cuenta en una fecha.
   * @param userId - Dueno de la cuenta.
   * @param accountId - UUID de la cuenta.
   * @param balance - Saldo (string NUMERIC).
   * @param asOfDate - Fecha del saldo (YYYY-MM-DD).
   * @returns El snapshot guardado.
   */
  async upsertSnapshot(
    userId: string,
    accountId: string,
    balance: string,
    asOfDate: string,
  ): Promise<SnapshotRow> {
    const [row] = await this.db
      .insert(accountSnapshots)
      .values({ userId, accountId, balance, asOfDate, source: 'manual' })
      .onConflictDoUpdate({
        target: [accountSnapshots.accountId, accountSnapshots.asOfDate],
        set: { balance },
      })
      .returning();
    return row;
  }

  /**
   * Lista los snapshots de una cuenta, del mas antiguo al mas reciente.
   * @param accountId - UUID de la cuenta.
   * @returns Los snapshots ordenados por fecha.
   */
  async listSnapshots(accountId: string): Promise<SnapshotRow[]> {
    return this.db
      .select()
      .from(accountSnapshots)
      .where(eq(accountSnapshots.accountId, accountId))
      .orderBy(asc(accountSnapshots.asOfDate));
  }

  /**
   * Obtiene el snapshot mas reciente de una cuenta en o antes de una fecha.
   * @param accountId - UUID de la cuenta.
   * @param date - Fecha limite (YYYY-MM-DD).
   * @returns El snapshot, o `undefined`.
   */
  async latestSnapshotOnOrBefore(
    accountId: string,
    date: string,
  ): Promise<SnapshotRow | undefined> {
    const [row] = await this.db
      .select()
      .from(accountSnapshots)
      .where(and(eq(accountSnapshots.accountId, accountId), lte(accountSnapshots.asOfDate, date)))
      .orderBy(desc(accountSnapshots.asOfDate))
      .limit(1);
    return row;
  }

  /**
   * Elimina un snapshot del usuario.
   * @param id - UUID del snapshot.
   * @param userId - Dueno esperado.
   * @returns El id eliminado, o `undefined`.
   */
  async deleteSnapshot(id: string, userId: string): Promise<string | undefined> {
    const [deleted] = await this.db
      .delete(accountSnapshots)
      .where(and(eq(accountSnapshots.id, id), eq(accountSnapshots.userId, userId)))
      .returning({ id: accountSnapshots.id });
    return deleted?.id;
  }

  /**
   * Suma los saldos de los snapshots del usuario por fecha (serie de patrimonio).
   * Solo incluye cuentas de tipo asset; las tarjetas de credito son pasivos y
   * se restan aparte via sumCreditCardLiabilities.
   * @param userId - Dueno de los datos.
   * @returns Lista de { asOfDate, total } ordenada por fecha.
   */
  async netWorthSeries(userId: string): Promise<{ asOfDate: string; total: string }[]> {
    return this.db
      .select({
        asOfDate: accountSnapshots.asOfDate,
        total: sql<string>`sum(${accountSnapshots.balance})`,
      })
      .from(accountSnapshots)
      .innerJoin(accounts, eq(accountSnapshots.accountId, accounts.id))
      .where(
        and(
          eq(accountSnapshots.userId, userId),
          eq(accounts.kind, 'asset'),
          isNull(accounts.deletedAt),
        ),
      )
      .groupBy(accountSnapshots.asOfDate)
      .orderBy(asc(accountSnapshots.asOfDate));
  }

  /**
   * Calcula el total adeudado en tarjetas de credito del usuario (cargos - pagos).
   * Se usa para restar del patrimonio neto, ya que las tarjetas son pasivos.
   * @param userId - Dueno de las cuentas.
   * @returns Total adeudado (como string NUMERIC); '0' si no hay tarjetas.
   */
  async sumCreditCardLiabilities(userId: string): Promise<string> {
    const cardIds = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.kind, 'credit_card'),
          isNull(accounts.deletedAt),
        ),
      );

    if (cardIds.length === 0) return '0';

    const ids = cardIds.map((r) => r.id);

    const [chargesRow] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), '0')` })
      .from(transactions)
      .where(inArray(transactions.accountId, ids));

    const [paymentsRow] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${transfers.amount}), '0')` })
      .from(transfers)
      .where(inArray(transfers.toAccountId, ids));

    const charges = Number(chargesRow?.total ?? 0);
    const payments = Number(paymentsRow?.total ?? 0);
    const liability = Math.max(0, charges - payments);
    return liability.toFixed(2);
  }

  /**
   * Actualiza campos permitidos de una cuenta del usuario.
   * @param id - UUID de la cuenta.
   * @param userId - Dueno esperado.
   * @param fields - Campos a actualizar.
   * @returns La cuenta actualizada, o `undefined`.
   */
  async update(
    id: string,
    userId: string,
    fields: AccountUpdateFields,
  ): Promise<AccountRow | undefined> {
    const [account] = await this.db
      .update(accounts)
      .set(fields)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId), isNull(accounts.deletedAt)))
      .returning();
    return account;
  }

  /**
   * Marca una cuenta como eliminada (soft delete).
   * @param id - UUID de la cuenta.
   * @param userId - Dueno esperado.
   * @returns El id eliminado, o `undefined`.
   */
  async softDelete(id: string, userId: string): Promise<string | undefined> {
    const [deleted] = await this.db
      .update(accounts)
      .set({ deletedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId), isNull(accounts.deletedAt)))
      .returning({ id: accounts.id });
    return deleted?.id;
  }
}
