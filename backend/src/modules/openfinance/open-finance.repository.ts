import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import {
  accountSnapshots,
  accounts,
  creditCardDetails,
  debts,
  openFinanceConnections,
} from '../../db/schema';
import {
  NormalizedAccount,
  NormalizedCard,
  NormalizedDebt,
} from '../../domain/openfinance/types';

/** Fila de una conexión de Open Finance tal como se almacena en BD. */
export type ConnectionRow = typeof openFinanceConnections.$inferSelect;

/**
 * Valores para crear una nueva conexión (sin id, timestamps ni userId —
 * userId se inyecta en el método createConnection).
 */
export type NewConnectionValues = Omit<
  typeof openFinanceConnections.$inferInsert,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'userId'
>;

/** Campos permitidos para actualizar una conexión existente (whitelist). */
export interface ConnectionUpdateFields {
  status?: ConnectionRow['status'];
  externalConnectionId?: string | null;
  consentGrantedAt?: Date | null;
  consentExpiresAt?: Date | null;
  lastSyncedAt?: Date | null;
}

/**
 * Repositorio de Open Finance.
 * Gestiona conexiones con bancos vía Open Finance y el upsert idempotente
 * de cuentas, tarjetas y deudas importadas desde proveedores externos.
 */
@Injectable()
export class OpenFinanceRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Crea una nueva conexión Open Finance para el usuario.
   * @param userId - UUID del usuario dueño de la conexión.
   * @param values - Datos de la conexión (sin id, timestamps ni userId).
   * @returns La fila de conexión recién creada.
   */
  async createConnection(userId: string, values: NewConnectionValues): Promise<ConnectionRow> {
    const [row] = await this.db
      .insert(openFinanceConnections)
      .values({ ...values, userId })
      .returning();
    return row;
  }

  /**
   * Lista todas las conexiones vivas (sin soft delete) de un usuario.
   * @param userId - UUID del usuario.
   * @returns Lista de conexiones activas del usuario.
   */
  async findConnectionsByUser(userId: string): Promise<ConnectionRow[]> {
    return this.db
      .select()
      .from(openFinanceConnections)
      .where(
        and(
          eq(openFinanceConnections.userId, userId),
          isNull(openFinanceConnections.deletedAt),
        ),
      );
  }

  /**
   * Busca una conexión viva por su id, garantizando que pertenezca al usuario.
   * @param id - UUID de la conexión.
   * @param userId - UUID del usuario dueño esperado.
   * @returns La conexión si existe y pertenece al usuario, o `undefined`.
   */
  async findConnectionForUser(id: string, userId: string): Promise<ConnectionRow | undefined> {
    const [row] = await this.db
      .select()
      .from(openFinanceConnections)
      .where(
        and(
          eq(openFinanceConnections.id, id),
          eq(openFinanceConnections.userId, userId),
          isNull(openFinanceConnections.deletedAt),
        ),
      )
      .limit(1);
    return row;
  }

  /**
   * Actualiza campos permitidos de una conexión existente (whitelist).
   * @param id - UUID de la conexión a actualizar.
   * @param fields - Campos a modificar.
   * @returns La fila de conexión actualizada.
   */
  async updateConnection(id: string, fields: ConnectionUpdateFields): Promise<ConnectionRow> {
    const [row] = await this.db
      .update(openFinanceConnections)
      .set(fields)
      .where(eq(openFinanceConnections.id, id))
      .returning();
    return row;
  }

  /**
   * Crea o actualiza una cuenta de activo importada desde Open Finance.
   * La idempotencia se garantiza por el par (connectionId, externalId):
   * si ya existe actualiza el nombre y devuelve created=false; si no, inserta.
   * @param userId - UUID del usuario dueño.
   * @param connectionId - UUID de la conexión Open Finance origen.
   * @param n - Cuenta normalizada del proveedor.
   * @returns { created, accountId } — created=true si se insertó, false si se actualizó.
   */
  async upsertAccount(
    userId: string,
    connectionId: string,
    n: NormalizedAccount,
  ): Promise<{ created: boolean; accountId: string }> {
    const existing = await this.findOfAccount(connectionId, n.externalId);
    if (existing) {
      await this.db
        .update(accounts)
        .set({ name: n.name })
        .where(eq(accounts.id, existing.id));
      return { created: false, accountId: existing.id };
    }
    const [row] = await this.db
      .insert(accounts)
      .values({
        userId,
        name: n.name,
        kind: 'asset',
        source: 'open_finance',
        connectionId,
        externalId: n.externalId,
      })
      .returning();
    return { created: true, accountId: row.id };
  }

  /**
   * Crea o actualiza una tarjeta de crédito importada desde Open Finance.
   * La idempotencia se garantiza por (connectionId, externalId): si ya existe,
   * actualiza nombre y detalles; si no, inserta cuenta tipo credit_card + detalles.
   * @param userId - UUID del usuario dueño.
   * @param connectionId - UUID de la conexión Open Finance origen.
   * @param n - Tarjeta normalizada del proveedor.
   * @returns { created, accountId } — created=true si se insertó, false si se actualizó.
   */
  async upsertCard(
    userId: string,
    connectionId: string,
    n: NormalizedCard,
  ): Promise<{ created: boolean; accountId: string }> {
    const existing = await this.findOfAccount(connectionId, n.externalId);
    if (existing) {
      await this.db
        .update(accounts)
        .set({ name: n.name })
        .where(eq(accounts.id, existing.id));
      await this.db
        .update(creditCardDetails)
        .set({
          creditLimit: n.creditLimit.toString(),
          statementDay: n.statementDay,
          paymentDay: n.paymentDay,
          rotativoRateEa: n.rotativoRateEa.toString(),
        })
        .where(eq(creditCardDetails.accountId, existing.id));
      return { created: false, accountId: existing.id };
    }
    const [row] = await this.db
      .insert(accounts)
      .values({
        userId,
        name: n.name,
        kind: 'credit_card',
        source: 'open_finance',
        connectionId,
        externalId: n.externalId,
      })
      .returning();
    await this.db.insert(creditCardDetails).values({
      accountId: row.id,
      creditLimit: n.creditLimit.toString(),
      statementDay: n.statementDay,
      paymentDay: n.paymentDay,
      rotativoRateEa: n.rotativoRateEa.toString(),
    });
    return { created: true, accountId: row.id };
  }

  /**
   * Crea o actualiza una deuda (préstamo) importada desde Open Finance.
   * La idempotencia se garantiza por (connectionId, externalId): si ya existe,
   * actualiza montos y tasa; si no, inserta la deuda.
   * @param userId - UUID del usuario dueño.
   * @param connectionId - UUID de la conexión Open Finance origen.
   * @param n - Deuda normalizada del proveedor.
   * @returns { created } — created=true si se insertó, false si se actualizó.
   */
  async upsertDebt(
    userId: string,
    connectionId: string,
    n: NormalizedDebt,
  ): Promise<{ created: boolean }> {
    const existing = await this.findOfDebt(connectionId, n.externalId);
    const principalAmount = n.balance.toString();
    const nominalRate = n.effectiveAnnualRate.toString();
    const effectiveAnnualRate = n.effectiveAnnualRate.toString();
    const termMonths = n.termMonths > 0 ? n.termMonths : 1;

    if (existing) {
      await this.db
        .update(debts)
        .set({ principalAmount, nominalRate, effectiveAnnualRate, termMonths })
        .where(eq(debts.id, existing.id));
      return { created: false };
    }

    await this.db.insert(debts).values({
      userId,
      creditor: n.creditor,
      // El valor ya viene saneado por mapLoanKindToDebtType en el dominio.
      debtType: n.debtType as typeof debts.$inferInsert.debtType,
      principalAmount,
      nominalRate,
      rateType: 'ea',
      effectiveAnnualRate,
      termMonths,
      startDate: this.today(),
      source: 'open_finance',
      connectionId,
      externalId: n.externalId,
    });
    return { created: true };
  }

  /**
   * Inserta el saldo de una cuenta como snapshot Open Finance para el día actual.
   * Es idempotente: si ya existe un snapshot para (accountId, hoy), lo actualiza.
   * @param userId - UUID del usuario dueño.
   * @param accountId - UUID de la cuenta cuyo saldo se registra.
   * @param balance - Saldo actual en pesos (número).
   */
  async insertSnapshot(userId: string, accountId: string, balance: number): Promise<void> {
    await this.db
      .insert(accountSnapshots)
      .values({
        userId,
        accountId,
        balance: balance.toString(),
        asOfDate: this.today(),
        source: 'open_finance',
      })
      .onConflictDoUpdate({
        target: [accountSnapshots.accountId, accountSnapshots.asOfDate],
        set: { balance: balance.toString(), source: 'open_finance' },
      });
  }

  /**
   * Busca una cuenta Open Finance por el par (connectionId, externalId).
   * @param connectionId - UUID de la conexión que originó la cuenta.
   * @param externalId - Identificador del producto en el banco externo.
   * @returns La fila de cuenta si existe, o `undefined`.
   */
  private async findOfAccount(connectionId: string, externalId: string) {
    const [row] = await this.db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.connectionId, connectionId),
          eq(accounts.externalId, externalId),
        ),
      )
      .limit(1);
    return row;
  }

  /**
   * Busca una deuda Open Finance por el par (connectionId, externalId).
   * @param connectionId - UUID de la conexión que originó la deuda.
   * @param externalId - Identificador del producto en el banco externo.
   * @returns La fila de deuda si existe, o `undefined`.
   */
  private async findOfDebt(connectionId: string, externalId: string) {
    const [row] = await this.db
      .select()
      .from(debts)
      .where(
        and(
          eq(debts.connectionId, connectionId),
          eq(debts.externalId, externalId),
        ),
      )
      .limit(1);
    return row;
  }

  /**
   * Devuelve la fecha de hoy en formato ISO YYYY-MM-DD (zona UTC).
   * @returns Cadena de fecha para usar como date en Drizzle.
   */
  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
