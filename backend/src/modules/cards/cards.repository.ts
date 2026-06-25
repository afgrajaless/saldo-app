import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, isNull, lt, lte, sql } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import {
  accounts,
  cardInstallmentItems,
  cardInstallmentPlans,
  cardStatements,
  creditCardDetails,
  transactions,
  transfers,
} from '../../db/schema';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

/** Fila combinada de cuenta + detalles de tarjeta (resultado del JOIN). */
export type CardRow = typeof accounts.$inferSelect & {
  creditLimit: string;
  statementDay: number;
  paymentDay: number;
  rotativoRateEa: string;
  minPaymentPct: string;
  managementFee: string | null;
  managementFeePeriod: 'none' | 'monthly' | 'annual';
  detailCreatedAt: Date;
  detailUpdatedAt: Date;
};

/** Campos de cuenta que pueden actualizarse en una tarjeta. */
type AccountPatch = Partial<Pick<typeof accounts.$inferInsert, 'name' | 'color'>>;

/** Campos de detalle que pueden actualizarse en una tarjeta. */
type DetailPatch = Partial<
  Pick<
    typeof creditCardDetails.$inferInsert,
    | 'creditLimit'
    | 'statementDay'
    | 'paymentDay'
    | 'rotativoRateEa'
    | 'minPaymentPct'
    | 'managementFee'
    | 'managementFeePeriod'
  >
>;

/**
 * Repositorio de tarjetas de credito. Combina `accounts` (kind=credit_card)
 * con `credit_card_details` en una transaccion. Todas las consultas estan
 * aisladas por user_id y excluyen registros con soft delete.
 */
@Injectable()
export class CardsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Crea una tarjeta de credito en una transaccion atomica:
   * inserta en `accounts` con kind='credit_card' y luego en `credit_card_details`.
   * @param userId - Dueno de la tarjeta.
   * @param dto - Datos de la tarjeta.
   * @returns La fila combinada de la tarjeta creada.
   */
  async createCard(userId: string, dto: CreateCardDto): Promise<CardRow> {
    return this.db.transaction(async (tx) => {
      const [account] = await tx
        .insert(accounts)
        .values({
          userId,
          name: dto.name,
          color: dto.color ?? '#1A1A2E',
          kind: 'credit_card',
        })
        .returning();

      await tx.insert(creditCardDetails).values({
        accountId: account.id,
        creditLimit: dto.creditLimit.toFixed(2),
        statementDay: dto.statementDay,
        paymentDay: dto.paymentDay,
        rotativoRateEa: dto.rotativoRateEa.toFixed(6),
        minPaymentPct: (dto.minPaymentPct ?? 0.05).toFixed(4),
        managementFee: dto.managementFee != null ? dto.managementFee.toFixed(2) : null,
        managementFeePeriod: dto.managementFeePeriod ?? 'none',
      });

      const card = await this.findCardForUser(account.id, userId, tx);
      return card!;
    });
  }

  /**
   * Actualiza campos de cuenta y/o detalles de tarjeta del usuario.
   * @param accountId - UUID de la tarjeta/cuenta.
   * @param userId - Dueno esperado.
   * @param dto - Campos a actualizar.
   * @returns La fila combinada actualizada, o `undefined` si no se encontro.
   */
  async updateCard(
    accountId: string,
    userId: string,
    dto: UpdateCardDto,
  ): Promise<CardRow | undefined> {
    return this.db.transaction(async (tx) => {
      const accountPatch: AccountPatch = {};
      if (dto.name !== undefined) accountPatch.name = dto.name;
      if (dto.color !== undefined) accountPatch.color = dto.color;

      if (Object.keys(accountPatch).length > 0) {
        await tx
          .update(accounts)
          .set(accountPatch)
          .where(
            and(eq(accounts.id, accountId), eq(accounts.userId, userId), isNull(accounts.deletedAt)),
          );
      }

      const detailPatch: DetailPatch = {};
      if (dto.creditLimit !== undefined) detailPatch.creditLimit = dto.creditLimit.toFixed(2);
      if (dto.statementDay !== undefined) detailPatch.statementDay = dto.statementDay;
      if (dto.paymentDay !== undefined) detailPatch.paymentDay = dto.paymentDay;
      if (dto.rotativoRateEa !== undefined) detailPatch.rotativoRateEa = dto.rotativoRateEa.toFixed(6);
      if (dto.minPaymentPct !== undefined) detailPatch.minPaymentPct = dto.minPaymentPct.toFixed(4);
      if (dto.managementFee !== undefined)
        detailPatch.managementFee = dto.managementFee != null ? dto.managementFee.toFixed(2) : null;
      if (dto.managementFeePeriod !== undefined) detailPatch.managementFeePeriod = dto.managementFeePeriod;

      if (Object.keys(detailPatch).length > 0) {
        await tx
          .update(creditCardDetails)
          .set(detailPatch)
          .where(eq(creditCardDetails.accountId, accountId));
      }

      return this.findCardForUser(accountId, userId, tx);
    });
  }

  /**
   * Busca una tarjeta activa por id verificando que sea del usuario y
   * que sea de tipo credit_card (no una cuenta de activo).
   * @param accountId - UUID de la tarjeta.
   * @param userId - Dueno esperado.
   * @param executor - Conexion o transaccion a usar (por defecto this.db).
   * @returns La fila combinada, o `undefined` si no existe o no es del usuario.
   */
  async findCardForUser(
    accountId: string,
    userId: string,
    executor: Database = this.db,
  ): Promise<CardRow | undefined> {
    const rows = await executor
      .select({
        id: accounts.id,
        userId: accounts.userId,
        name: accounts.name,
        color: accounts.color,
        kind: accounts.kind,
        yieldType: accounts.yieldType,
        effectiveAnnualRate: accounts.effectiveAnnualRate,
        createdAt: accounts.createdAt,
        updatedAt: accounts.updatedAt,
        deletedAt: accounts.deletedAt,
        creditLimit: creditCardDetails.creditLimit,
        statementDay: creditCardDetails.statementDay,
        paymentDay: creditCardDetails.paymentDay,
        rotativoRateEa: creditCardDetails.rotativoRateEa,
        minPaymentPct: creditCardDetails.minPaymentPct,
        managementFee: creditCardDetails.managementFee,
        managementFeePeriod: creditCardDetails.managementFeePeriod,
        detailCreatedAt: creditCardDetails.createdAt,
        detailUpdatedAt: creditCardDetails.updatedAt,
      })
      .from(accounts)
      .innerJoin(creditCardDetails, eq(creditCardDetails.accountId, accounts.id))
      .where(
        and(
          eq(accounts.id, accountId),
          eq(accounts.userId, userId),
          eq(accounts.kind, 'credit_card'),
          isNull(accounts.deletedAt),
        ),
      )
      .limit(1);

    return rows[0] as CardRow | undefined;
  }

  /**
   * Suma todos los cargos (transacciones de egreso) asociados a una cuenta de
   * tarjeta de credito. Un cargo es cualquier transaccion cuyo `account_id`
   * apunte a la tarjeta; representa compras y cargos que incrementan la deuda.
   * @param accountId - UUID de la tarjeta/cuenta.
   * @returns El total de cargos en pesos (0 si no hay ninguno).
   */
  async sumCardCharges(accountId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), '0')` })
      .from(transactions)
      .where(eq(transactions.accountId, accountId));
    return Number(row?.total ?? 0);
  }

  /**
   * Suma todos los pagos recibidos por una tarjeta de credito. Un pago es una
   * transferencia cuyo `to_account_id` apunte a la tarjeta; representa abonos
   * que reducen la deuda.
   * @param accountId - UUID de la tarjeta/cuenta.
   * @returns El total de pagos en pesos (0 si no hay ninguno).
   */
  async sumCardPayments(accountId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${transfers.amount}), '0')` })
      .from(transfers)
      .where(eq(transfers.toAccountId, accountId));
    return Number(row?.total ?? 0);
  }

  /**
   * Suma los cargos (transactions) de la tarjeta entre dos fechas (ambas inclusivas).
   * Ventana del ciclo: desde el dia despues del corte anterior hasta el corte actual.
   * @param accountId - UUID de la tarjeta.
   * @param fromDate - Inicio de la ventana YYYY-MM-DD (primer dia del ciclo = corteAnterior + 1).
   * @param toDate - Fecha de corte actual YYYY-MM-DD (inclusivo).
   * @returns Total de cargos en pesos.
   */
  async sumChargesInCycle(accountId: string, fromDate: string, toDate: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), '0')` })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          gte(transactions.occurredOn, fromDate),
          lte(transactions.occurredOn, toDate),
        ),
      );
    return Number(row?.total ?? 0);
  }

  /**
   * Suma (principal + interest) de las cuotas diferidas con due_on dentro del ciclo.
   * @param accountId - UUID de la tarjeta.
   * @param fromDate - Inicio del ciclo YYYY-MM-DD.
   * @param toDate - Fin del ciclo YYYY-MM-DD.
   * @returns Total de cuotas diferidas vencidas en el ciclo.
   */
  async sumInstallmentsDueInCycle(accountId: string, fromDate: string, toDate: string): Promise<number> {
    const [row] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${cardInstallmentItems.principal} + ${cardInstallmentItems.interest}), '0')`,
      })
      .from(cardInstallmentItems)
      .innerJoin(cardInstallmentPlans, eq(cardInstallmentPlans.id, cardInstallmentItems.planId))
      .where(
        and(
          eq(cardInstallmentPlans.accountId, accountId),
          gte(cardInstallmentItems.dueOn, fromDate),
          lte(cardInstallmentItems.dueOn, toDate),
        ),
      );
    return Number(row?.total ?? 0);
  }

  /**
   * Busca el extracto mas reciente cerrado (status='closed' o 'paid') anterior a una fecha de corte.
   * Se usa para obtener el saldo rotativo que arrastra intereses al siguiente ciclo.
   * @param accountId - UUID de la tarjeta.
   * @param beforeCutoff - Fecha de corte actual; busca extractos con cutoff_date < esta fecha.
   * @returns El extracto previo cerrado o undefined si no existe.
   */
  async findPreviousClosedStatement(
    accountId: string,
    beforeCutoff: string,
  ): Promise<typeof cardStatements.$inferSelect | undefined> {
    const rows = await this.db
      .select()
      .from(cardStatements)
      .where(
        and(
          eq(cardStatements.accountId, accountId),
          lt(cardStatements.cutoffDate, beforeCutoff),
          inArray(cardStatements.status, ['closed', 'paid']),
        ),
      )
      .orderBy(desc(cardStatements.cutoffDate))
      .limit(1);
    return rows[0];
  }

  /**
   * Busca el extracto de una tarjeta para una fecha de corte exacta.
   * @param accountId - UUID de la tarjeta.
   * @param cutoffDate - Fecha de corte YYYY-MM-DD.
   * @returns El extracto o undefined si no existe.
   */
  async findStatementByCutoff(
    accountId: string,
    cutoffDate: string,
  ): Promise<typeof cardStatements.$inferSelect | undefined> {
    const rows = await this.db
      .select()
      .from(cardStatements)
      .where(
        and(
          eq(cardStatements.accountId, accountId),
          eq(cardStatements.cutoffDate, cutoffDate),
        ),
      )
      .limit(1);
    return rows[0];
  }

  /**
   * Upsert del extracto de la tarjeta: inserta si no existe, actualiza si ya existe.
   * La unicidad se basa en (account_id, cutoff_date).
   * @param data - Datos del extracto (account_id + cutoff_date identifican el registro).
   * @returns El extracto insertado o actualizado.
   */
  async upsertStatement(data: {
    accountId: string;
    cutoffDate: string;
    paymentDueDate: string;
    estimatedBalance: number;
    estimatedMinPayment: number;
    reconciledBalance?: number | null;
    reconciledMinPayment?: number | null;
    reconciledTotalPayment?: number | null;
    status?: 'open' | 'closed' | 'paid';
  }): Promise<typeof cardStatements.$inferSelect> {
    const [row] = await this.db
      .insert(cardStatements)
      .values({
        accountId: data.accountId,
        cutoffDate: data.cutoffDate,
        paymentDueDate: data.paymentDueDate,
        estimatedBalance: data.estimatedBalance.toFixed(2),
        estimatedMinPayment: data.estimatedMinPayment.toFixed(2),
        reconciledBalance: data.reconciledBalance != null ? data.reconciledBalance.toFixed(2) : null,
        reconciledMinPayment:
          data.reconciledMinPayment != null ? data.reconciledMinPayment.toFixed(2) : null,
        reconciledTotalPayment:
          data.reconciledTotalPayment != null ? data.reconciledTotalPayment.toFixed(2) : null,
        status: data.status ?? 'open',
      })
      .onConflictDoUpdate({
        target: [cardStatements.accountId, cardStatements.cutoffDate],
        set: {
          paymentDueDate: data.paymentDueDate,
          estimatedBalance: data.estimatedBalance.toFixed(2),
          estimatedMinPayment: data.estimatedMinPayment.toFixed(2),
          reconciledBalance: data.reconciledBalance != null ? data.reconciledBalance.toFixed(2) : null,
          reconciledMinPayment:
            data.reconciledMinPayment != null ? data.reconciledMinPayment.toFixed(2) : null,
          reconciledTotalPayment:
            data.reconciledTotalPayment != null ? data.reconciledTotalPayment.toFixed(2) : null,
          status: data.status ?? 'open',
        },
      })
      .returning();
    return row;
  }

  /**
   * Lista todas las tarjetas activas del usuario, mas recientes primero.
   * @param userId - Dueno de las tarjetas.
   * @returns Lista de filas combinadas.
   */
  async listCards(userId: string): Promise<CardRow[]> {
    const rows = await this.db
      .select({
        id: accounts.id,
        userId: accounts.userId,
        name: accounts.name,
        color: accounts.color,
        kind: accounts.kind,
        yieldType: accounts.yieldType,
        effectiveAnnualRate: accounts.effectiveAnnualRate,
        createdAt: accounts.createdAt,
        updatedAt: accounts.updatedAt,
        deletedAt: accounts.deletedAt,
        creditLimit: creditCardDetails.creditLimit,
        statementDay: creditCardDetails.statementDay,
        paymentDay: creditCardDetails.paymentDay,
        rotativoRateEa: creditCardDetails.rotativoRateEa,
        minPaymentPct: creditCardDetails.minPaymentPct,
        managementFee: creditCardDetails.managementFee,
        managementFeePeriod: creditCardDetails.managementFeePeriod,
        detailCreatedAt: creditCardDetails.createdAt,
        detailUpdatedAt: creditCardDetails.updatedAt,
      })
      .from(accounts)
      .innerJoin(creditCardDetails, eq(creditCardDetails.accountId, accounts.id))
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.kind, 'credit_card'),
          isNull(accounts.deletedAt),
        ),
      )
      .orderBy(accounts.createdAt);

    return rows as CardRow[];
  }
}
