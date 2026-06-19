import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { debts, installments, payments } from '../../db/schema';
import { InstallmentSeed } from '../debts/installment-schedule.factory';

/** Fila de pago tal como se almacena. */
export type PaymentRow = typeof payments.$inferSelect;
/** Valores para insertar un pago (sin id ni timestamp). */
export type NewPaymentValues = Omit<typeof payments.$inferInsert, 'id' | 'createdAt'>;
/** Estado al que se puede mover una cuota tras un pago. */
export type InstallmentStatus = (typeof installments.$inferSelect)['status'];

/** Parametros para registrar un abono a capital con su recalculo. */
export interface PrepaymentPersistence {
  debtId: string;
  payment: NewPaymentValues;
  /** Se borran las cuotas con number mayor a este valor (las pendientes). */
  deleteAboveNumber: number;
  /** Nuevas cuotas proyectadas que reemplazan a las pendientes. */
  newInstallments: InstallmentSeed[];
  /** Si el abono cancela la deuda, se marca como pagada. */
  markDebtPaid: boolean;
}

/**
 * Repositorio de pagos. Encapsula la persistencia de pagos regulares y de
 * abonos a capital (que reescriben el cronograma) en transacciones atomicas.
 */
@Injectable()
export class PaymentsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Registra un pago regular y, si aplica, actualiza el estado de la cuota.
   * @param debtId - Deuda a la que pertenece el pago.
   * @param values - Datos del pago.
   * @param installmentId - Cuota afectada (opcional).
   * @param installmentStatus - Nuevo estado de la cuota (si hay cuota).
   * @returns El pago registrado.
   */
  async registerRegular(
    debtId: string,
    values: NewPaymentValues,
    installmentId: string | undefined,
    installmentStatus: InstallmentStatus | undefined,
  ): Promise<PaymentRow> {
    return this.db.transaction(async (tx) => {
      const [payment] = await tx.insert(payments).values(values).returning();
      if (installmentId && installmentStatus) {
        await tx
          .update(installments)
          .set({ status: installmentStatus })
          .where(and(eq(installments.id, installmentId), eq(installments.debtId, debtId)));
      }
      return payment;
    });
  }

  /**
   * Registra un abono a capital: inserta el pago, reemplaza las cuotas
   * pendientes por el cronograma recalculado y, si corresponde, marca la deuda
   * como pagada. Todo en una sola transaccion.
   * @param args - Datos del pago, cuotas nuevas y banderas de control.
   * @returns El pago registrado.
   */
  async registerPrepayment(args: PrepaymentPersistence): Promise<PaymentRow> {
    return this.db.transaction(async (tx) => {
      const [payment] = await tx.insert(payments).values(args.payment).returning();
      await tx
        .delete(installments)
        .where(and(eq(installments.debtId, args.debtId), gt(installments.number, args.deleteAboveNumber)));
      if (args.newInstallments.length > 0) {
        await tx
          .insert(installments)
          .values(args.newInstallments.map((row) => ({ ...row, debtId: args.debtId })));
      }
      if (args.markDebtPaid) {
        await tx.update(debts).set({ status: 'pagada' }).where(eq(debts.id, args.debtId));
      }
      return payment;
    });
  }

  /**
   * Lista los pagos de una deuda, del mas antiguo al mas reciente.
   * @param debtId - UUID de la deuda.
   * @returns Los pagos de la deuda.
   */
  async findByDebt(debtId: string): Promise<PaymentRow[]> {
    return this.db
      .select()
      .from(payments)
      .where(eq(payments.debtId, debtId))
      .orderBy(asc(payments.paymentDate), asc(payments.createdAt));
  }
}
