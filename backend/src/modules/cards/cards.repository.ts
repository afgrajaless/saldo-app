import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { accounts, creditCardDetails, transactions, transfers } from '../../db/schema';
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
