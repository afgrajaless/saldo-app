import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { applyPrepayment } from '../../domain/amortization/prepayment';
import { PrepaymentMode } from '../../domain/amortization/prepayment.types';
import { normalizeToMonthly } from '../../domain/rates/rate-conversion';
import { RateType } from '../../domain/rates/rate-type';
import { DebtRow, DebtsRepository, InstallmentRow } from '../debts/debts.repository';
import { toInsuranceConfig } from '../debts/insurance.mapper';
import { scheduleToSeeds } from '../debts/installment-schedule.factory';
import { addMonths } from '../../shared/date/add-months';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto, PaymentResultDto } from './dto/payment-response.dto';
import { PaymentRow, PaymentsRepository } from './payments.repository';

/**
 * Servicio de pagos. Maneja pagos regulares (marcan una cuota) y abonos a
 * capital (recalculan el cronograma con el motor de dominio, Ley 1555/2012).
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly debtsRepository: DebtsRepository,
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  /**
   * Registra un pago sobre una deuda del usuario.
   * @param userId - Dueno de la deuda.
   * @param debtId - UUID de la deuda.
   * @param dto - Datos del pago.
   * @returns El pago registrado y, si es abono, el resumen del recalculo.
   * @throws NotFoundException si la deuda no existe o no es del usuario.
   */
  async register(userId: string, debtId: string, dto: CreatePaymentDto): Promise<PaymentResultDto> {
    const debt = await this.getOwnedDebtOrFail(userId, debtId);
    return dto.type === 'abono_capital'
      ? this.registerPrepayment(debt, dto)
      : this.registerRegular(debt, dto);
  }

  /**
   * Lista los pagos de una deuda del usuario.
   * @param userId - Dueno de la deuda.
   * @param debtId - UUID de la deuda.
   * @returns Los pagos de la deuda.
   * @throws NotFoundException si la deuda no existe o no es del usuario.
   */
  async findAll(userId: string, debtId: string): Promise<PaymentResponseDto[]> {
    await this.getOwnedDebtOrFail(userId, debtId);
    const rows = await this.paymentsRepository.findByDebt(debtId);
    return rows.map((row) => this.toPaymentResponse(row));
  }

  /**
   * Registra un pago regular y, si se indica cuota, la marca pagada o parcial.
   * @param debt - Deuda objetivo.
   * @param dto - Datos del pago regular.
   * @returns El resultado del pago.
   */
  private async registerRegular(debt: DebtRow, dto: CreatePaymentDto): Promise<PaymentResultDto> {
    let installmentStatus: InstallmentRow['status'] | undefined;
    if (dto.installmentId) {
      const installment = await this.findInstallmentOrFail(debt.id, dto.installmentId);
      installmentStatus = dto.amount >= Number(installment.totalAmount) ? 'pagada' : 'parcial';
    }
    const payment = await this.paymentsRepository.registerRegular(
      debt.id,
      {
        debtId: debt.id,
        installmentId: dto.installmentId ?? null,
        amount: dto.amount.toFixed(2),
        paymentDate: dto.paymentDate,
        type: 'regular',
      },
      dto.installmentId,
      installmentStatus,
    );
    return { payment: this.toPaymentResponse(payment) };
  }

  /**
   * Registra un abono a capital: recalcula el cronograma de las cuotas
   * pendientes y reemplaza esas cuotas en la base de datos.
   * @param debt - Deuda objetivo.
   * @param dto - Datos del abono (incluye la modalidad).
   * @returns El pago y el resumen del recalculo.
   * @throws BadRequestException si falta la modalidad o no hay cuotas pendientes.
   */
  private async registerPrepayment(debt: DebtRow, dto: CreatePaymentDto): Promise<PaymentResultDto> {
    if (!dto.mode) {
      throw new BadRequestException('El modo de abono es requerido para abono_capital.');
    }
    const installments = await this.debtsRepository.findInstallments(debt.id);
    const { lastPaidNumber, currentBalance, remaining } = this.resolveOutstanding(debt, installments);
    if (remaining === 0) {
      throw new BadRequestException('No hay cuotas pendientes para abonar.');
    }

    const monthlyRate = normalizeToMonthly(Number(debt.effectiveAnnualRate), RateType.EFFECTIVE_ANNUAL);
    const result = applyPrepayment({
      currentBalance,
      monthlyRate,
      remainingInstallments: remaining,
      extraPayment: dto.amount,
      mode: dto.mode as PrepaymentMode,
      insurance: toInsuranceConfig(debt.insuranceMode, debt.insuranceValue),
      interestMode: debt.interestMode,
      // El recalculo se ancla a la fecha de la ultima cuota pagada.
      anchorDate: addMonths(debt.startDate, lastPaidNumber),
    });

    const newInstallments = result.isPaidOff
      ? []
      : scheduleToSeeds(result.schedule, lastPaidNumber + 1, debt.startDate);

    const payment = await this.paymentsRepository.registerPrepayment({
      debtId: debt.id,
      payment: {
        debtId: debt.id,
        installmentId: null,
        amount: result.appliedExtraPayment.toFixed(2),
        paymentDate: dto.paymentDate,
        type: 'abono_capital',
      },
      deleteAboveNumber: lastPaidNumber,
      newInstallments,
      markDebtPaid: result.isPaidOff,
    });

    return {
      payment: this.toPaymentResponse(payment),
      prepayment: {
        appliedExtraPayment: result.appliedExtraPayment,
        newBalance: result.newBalance,
        isPaidOff: result.isPaidOff,
        interestSaved: result.interestSaved,
        remainingInstallments: newInstallments.length,
      },
    };
  }

  /**
   * Calcula el saldo pendiente y las cuotas futuras a partir del cronograma.
   *
   * El saldo actual es el saldo restante de la ultima cuota pagada (o el capital
   * si no hay ninguna pagada); las cuotas futuras son las posteriores a esa.
   * @param debt - Deuda objetivo.
   * @param installments - Cuotas de la deuda.
   * @returns Numero de la ultima cuota pagada, saldo actual y cuotas restantes.
   */
  private resolveOutstanding(
    debt: DebtRow,
    installments: InstallmentRow[],
  ): { lastPaidNumber: number; currentBalance: number; remaining: number } {
    const paid = installments.filter((i) => i.status === 'pagada');
    const lastPaidNumber = paid.reduce((max, i) => Math.max(max, i.number), 0);
    const lastPaid = installments.find((i) => i.number === lastPaidNumber);
    const currentBalance = lastPaid ? Number(lastPaid.remainingBalance) : Number(debt.principalAmount);
    const remaining = installments.filter((i) => i.number > lastPaidNumber).length;
    return { lastPaidNumber, currentBalance, remaining };
  }

  /**
   * Recupera una deuda del usuario o lanza 404.
   * @param userId - Dueno esperado.
   * @param debtId - UUID de la deuda.
   * @returns La deuda.
   */
  private async getOwnedDebtOrFail(userId: string, debtId: string): Promise<DebtRow> {
    const debt = await this.debtsRepository.findByIdForUser(debtId, userId);
    if (!debt) {
      throw new NotFoundException('Deuda no encontrada.');
    }
    return debt;
  }

  /**
   * Busca una cuota de la deuda o lanza 404.
   * @param debtId - UUID de la deuda.
   * @param installmentId - UUID de la cuota.
   * @returns La cuota.
   */
  private async findInstallmentOrFail(debtId: string, installmentId: string): Promise<InstallmentRow> {
    const installments = await this.debtsRepository.findInstallments(debtId);
    const installment = installments.find((i) => i.id === installmentId);
    if (!installment) {
      throw new NotFoundException('Cuota no encontrada en esta deuda.');
    }
    return installment;
  }

  /**
   * Mapea una fila de pago a su DTO de respuesta.
   * @param row - Fila de pago.
   * @returns El DTO de respuesta.
   */
  private toPaymentResponse(row: PaymentRow): PaymentResponseDto {
    return {
      id: row.id,
      debtId: row.debtId,
      installmentId: row.installmentId,
      amount: Number(row.amount),
      paymentDate: row.paymentDate,
      type: row.type,
      createdAt: row.createdAt,
    };
  }
}
