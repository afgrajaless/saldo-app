import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { groupMembers, settlements, transactions } from '../../db/schema';

/** Fila de settlement tal como se almacena en la base de datos. */
export type SettlementRow = typeof settlements.$inferSelect;

/** Campos necesarios para insertar un settlement (sin id, createdAt ni auditoria). */
export interface NewSettlementData {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  settledOn: string;
}

/**
 * Datos del movimiento personal opcional que acompana al settlement.
 * side indica si el usuario autenticado es el pagador (from = egreso) o el receptor (to = ingreso).
 * accountId es obligatorio: el DTO exige que se especifique la cuenta.
 */
export interface PersonalTxData {
  side: 'from' | 'to';
  userId: string;
  accountId: string;
  categoryId: string;
}

/**
 * Repositorio de liquidaciones de deuda entre miembros de un grupo.
 * Toda insercion que incluye movimiento personal se ejecuta en una unica transaccion atomica.
 */
@Injectable()
export class SettlementsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Inserta un settlement y, opcionalmente, la transaccion personal del usuario en la misma
   * transaccion de base de datos. Si se indica personalTx, crea primero la transaccion en
   * la tabla transactions y guarda su id en fromTransactionId (si side='from') o
   * toTransactionId (si side='to'), luego inserta el settlement.
   * @param groupId - UUID del grupo al que pertenece la liquidacion.
   * @param createdByUserId - UUID del usuario autenticado que registra la liquidacion.
   * @param data - Campos del settlement (miembros, monto, fecha).
   * @param personalTx - Datos del movimiento personal opcional.
   * @returns La fila del settlement recien creado.
   */
  async insertSettlement(
    groupId: string,
    createdByUserId: string,
    data: NewSettlementData,
    personalTx?: PersonalTxData,
  ): Promise<SettlementRow> {
    return this.db.transaction(async (tx) => {
      let fromTransactionId: string | null = null;
      let toTransactionId: string | null = null;

      if (personalTx) {
        // Determina la descripcion segun el rol del usuario en la liquidacion.
        const description =
          personalTx.side === 'from'
            ? 'Liquidacion de deuda en grupo'
            : 'Cobro de deuda en grupo';

        // Inserta la transaccion personal del usuario en la tabla transactions.
        const [txRow] = await tx
          .insert(transactions)
          .values({
            userId: personalTx.userId,
            categoryId: personalTx.categoryId,
            accountId: personalTx.accountId,
            amount: data.amount.toFixed(2),
            occurredOn: data.settledOn,
            description,
          })
          .returning({ id: transactions.id });

        // Guarda el id de la transaccion en el campo correspondiente al rol.
        if (personalTx.side === 'from') {
          fromTransactionId = txRow.id;
        } else {
          toTransactionId = txRow.id;
        }
      }

      // Inserta el settlement con los ids de transaccion opcionales.
      const [settlement] = await tx
        .insert(settlements)
        .values({
          groupId,
          fromMemberId: data.fromMemberId,
          toMemberId: data.toMemberId,
          amount: data.amount.toFixed(2),
          settledOn: data.settledOn,
          fromTransactionId,
          toTransactionId,
          createdByUserId,
        })
        .returning();

      return settlement;
    });
  }

  /**
   * Obtiene todos los settlements de un grupo, del mas reciente al mas antiguo.
   * @param groupId - UUID del grupo.
   * @returns Lista de settlements del grupo.
   */
  async listSettlements(groupId: string): Promise<SettlementRow[]> {
    return this.db
      .select()
      .from(settlements)
      .where(eq(settlements.groupId, groupId))
      .orderBy(desc(settlements.createdAt));
  }

  /**
   * Busca un miembro activo del grupo por su UUID. Util para validaciones
   * internas sin depender del repositorio de grupos.
   * @param groupId - UUID del grupo.
   * @param memberId - UUID del miembro.
   * @returns La fila del miembro, o `undefined`.
   */
  async findMemberById(
    groupId: string,
    memberId: string,
  ): Promise<{ id: string; groupId: string; userId: string | null } | undefined> {
    const [member] = await this.db
      .select({ id: groupMembers.id, groupId: groupMembers.groupId, userId: groupMembers.userId })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.id, memberId),
          eq(groupMembers.groupId, groupId),
          isNull(groupMembers.removedAt),
        ),
      )
      .limit(1);
    return member;
  }
}
