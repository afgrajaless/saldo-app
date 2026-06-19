import { Injectable, NotFoundException } from '@nestjs/common';
import {
  normalizeToEffectiveAnnual,
  normalizeToMonthly,
} from '../../domain/rates/rate-conversion';
import { RateType } from '../../domain/rates/rate-type';
import {
  DebtDetailDto,
  DebtResponseDto,
  InstallmentResponseDto,
} from './dto/debt-response.dto';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import {
  DebtRow,
  DebtsRepository,
  InstallmentRow,
} from './debts.repository';
import { buildSchedule } from './installment-schedule.factory';

/** Mapea el tipo de tasa de la BD al tipo del dominio. */
const RATE_TYPE_MAP: Record<string, RateType> = {
  ea: RateType.EFFECTIVE_ANNUAL,
  mv: RateType.MONTHLY_EFFECTIVE,
  nominal_anual: RateType.NOMINAL_ANNUAL,
};

/**
 * Servicio de obligaciones (deudas). Orquesta el motor de dominio (conversion
 * de tasas y amortizacion) con la persistencia, siempre aislado por usuario.
 */
@Injectable()
export class DebtsService {
  constructor(private readonly debtsRepository: DebtsRepository) {}

  /**
   * Crea una deuda: normaliza la tasa a E.A., genera el cronograma segun el
   * sistema elegido y persiste deuda y cuotas en una transaccion.
   * @param userId - Dueno de la deuda.
   * @param dto - Datos de la obligacion.
   * @returns La deuda creada.
   */
  async create(userId: string, dto: CreateDebtDto): Promise<DebtResponseDto> {
    const rateType = RATE_TYPE_MAP[dto.rateType];
    const monthlyRate = normalizeToMonthly(dto.nominalRate, rateType);
    const effectiveAnnualRate = normalizeToEffectiveAnnual(dto.nominalRate, rateType);
    const system = dto.amortizationSystem ?? 'frances';

    const { rows } = buildSchedule(
      system,
      dto.principalAmount,
      monthlyRate,
      dto.termMonths,
      dto.startDate,
    );

    const debt = await this.debtsRepository.createWithSchedule(
      userId,
      {
        creditor: dto.creditor,
        debtType: dto.debtType,
        principalAmount: dto.principalAmount.toFixed(2),
        nominalRate: dto.nominalRate.toFixed(6),
        rateType: dto.rateType,
        effectiveAnnualRate: effectiveAnnualRate.toFixed(6),
        amortizationSystem: system,
        termMonths: dto.termMonths,
        startDate: dto.startDate,
        status: 'activa',
      },
      rows,
    );
    return this.toDebtResponse(debt);
  }

  /**
   * Lista las deudas vivas del usuario.
   * @param userId - Dueno de las deudas.
   * @returns Las deudas del usuario.
   */
  async findAll(userId: string): Promise<DebtResponseDto[]> {
    const debts = await this.debtsRepository.findAllByUser(userId);
    return debts.map((debt) => this.toDebtResponse(debt));
  }

  /**
   * Obtiene una deuda con su cronograma completo y totales.
   * @param userId - Dueno de la deuda.
   * @param id - UUID de la deuda.
   * @returns El detalle de la deuda.
   * @throws NotFoundException si no existe o no pertenece al usuario.
   */
  async findOne(userId: string, id: string): Promise<DebtDetailDto> {
    const debt = await this.getOwnedDebtOrFail(userId, id);
    const installments = await this.debtsRepository.findInstallments(debt.id);
    const installmentDtos = installments.map((row) => this.toInstallmentResponse(row));
    return {
      ...this.toDebtResponse(debt),
      installments: installmentDtos,
      totalInterest: this.sumBy(installmentDtos, (i) => i.interestPortion),
      totalPaid: this.sumBy(installmentDtos, (i) => i.totalAmount),
    };
  }

  /**
   * Actualiza el acreedor y/o el estado de una deuda.
   * @param userId - Dueno de la deuda.
   * @param id - UUID de la deuda.
   * @param dto - Campos a actualizar.
   * @returns La deuda actualizada.
   * @throws NotFoundException si no existe o no pertenece al usuario.
   */
  async update(userId: string, id: string, dto: UpdateDebtDto): Promise<DebtResponseDto> {
    const updated = await this.debtsRepository.update(id, userId, {
      creditor: dto.creditor,
      status: dto.status,
    });
    if (!updated) {
      throw new NotFoundException('Deuda no encontrada.');
    }
    return this.toDebtResponse(updated);
  }

  /**
   * Elimina (soft delete) una deuda del usuario.
   * @param userId - Dueno de la deuda.
   * @param id - UUID de la deuda.
   * @throws NotFoundException si no existe o no pertenece al usuario.
   */
  async remove(userId: string, id: string): Promise<void> {
    const deletedId = await this.debtsRepository.softDelete(id, userId);
    if (!deletedId) {
      throw new NotFoundException('Deuda no encontrada.');
    }
  }

  /**
   * Recupera una deuda del usuario o lanza 404.
   * @param userId - Dueno esperado.
   * @param id - UUID de la deuda.
   * @returns La deuda.
   * @throws NotFoundException si no existe o no es del usuario.
   */
  private async getOwnedDebtOrFail(userId: string, id: string): Promise<DebtRow> {
    const debt = await this.debtsRepository.findByIdForUser(id, userId);
    if (!debt) {
      throw new NotFoundException('Deuda no encontrada.');
    }
    return debt;
  }

  /**
   * Suma una propiedad numerica de una lista, redondeando a 2 decimales.
   * @param items - Lista de elementos.
   * @param selector - Funcion que extrae el numero a sumar.
   * @returns La suma redondeada a centavos.
   */
  private sumBy<T>(items: T[], selector: (item: T) => number): number {
    const total = items.reduce((acc, item) => acc + selector(item), 0);
    return Math.round((total + Number.EPSILON) * 100) / 100;
  }

  /**
   * Mapea una fila de deuda a su DTO de respuesta (montos como numero).
   * @param debt - Fila de deuda.
   * @returns El DTO de respuesta.
   */
  private toDebtResponse(debt: DebtRow): DebtResponseDto {
    return {
      id: debt.id,
      creditor: debt.creditor,
      debtType: debt.debtType,
      principalAmount: Number(debt.principalAmount),
      nominalRate: Number(debt.nominalRate),
      rateType: debt.rateType,
      effectiveAnnualRate: Number(debt.effectiveAnnualRate),
      amortizationSystem: debt.amortizationSystem,
      termMonths: debt.termMonths,
      startDate: debt.startDate,
      status: debt.status,
      createdAt: debt.createdAt,
    };
  }

  /**
   * Mapea una fila de cuota a su DTO de respuesta (montos como numero).
   * @param row - Fila de cuota.
   * @returns El DTO de respuesta.
   */
  private toInstallmentResponse(row: InstallmentRow): InstallmentResponseDto {
    return {
      number: row.number,
      dueDate: row.dueDate,
      principalPortion: Number(row.principalPortion),
      interestPortion: Number(row.interestPortion),
      totalAmount: Number(row.totalAmount),
      remainingBalance: Number(row.remainingBalance),
      status: row.status,
    };
  }
}
