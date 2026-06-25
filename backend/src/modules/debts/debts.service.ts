import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  normalizeToEffectiveAnnual,
  normalizeToMonthly,
} from '../../domain/rates/rate-conversion';
import { RateType } from '../../domain/rates/rate-type';
import { InsuranceConfig, InsuranceMode, NO_INSURANCE } from '../../domain/insurance/insurance';
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

/** Metricas de pago derivadas del cronograma de una deuda. */
interface DebtMetrics {
  currentBalance: number;
  monthlyPayment: number;
  monthlyInterestCost: number;
  paidInstallments: number;
  remainingInstallments: number;
}

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
    const insurance = this.buildInsurance(dto);
    const interestMode = dto.interestMode ?? 'monthly';

    const { rows } = buildSchedule(
      system,
      dto.principalAmount,
      monthlyRate,
      dto.termMonths,
      dto.startDate,
      insurance,
      interestMode,
    );

    const metrics: DebtMetrics = {
      currentBalance: dto.principalAmount,
      monthlyPayment: rows.length > 0 ? Number(rows[0].totalAmount) : 0,
      monthlyInterestCost: rows.length > 0 ? Number(rows[0].interestPortion) : 0,
      paidInstallments: 0,
      remainingInstallments: rows.length,
    };

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
        insuranceMode: insurance.mode,
        insuranceValue: insurance.mode === InsuranceMode.NONE ? null : insurance.value.toFixed(8),
        interestMode,
        status: 'activa',
      },
      rows,
    );
    return this.toDebtResponse(debt, metrics);
  }

  /**
   * Construye la configuracion de seguro a partir del DTO.
   * @param dto - Datos de la deuda.
   * @returns La configuracion de seguro del dominio.
   */
  private buildInsurance(dto: CreateDebtDto): InsuranceConfig {
    const mode = dto.insuranceMode ?? 'none';
    if (mode === 'none' || dto.insuranceValue === undefined) {
      return NO_INSURANCE;
    }
    return { mode: mode as InsuranceMode, value: dto.insuranceValue };
  }

  /**
   * Lista las deudas vivas del usuario.
   * @param userId - Dueno de las deudas.
   * @returns Las deudas del usuario.
   */
  async findAll(userId: string): Promise<DebtResponseDto[]> {
    const debts = await this.debtsRepository.findAllByUser(userId);
    const installments = await this.debtsRepository.findInstallmentsByUser(userId);
    const byDebt = this.groupInstallmentsByDebt(installments);
    return debts.map((debt) =>
      this.toDebtResponse(debt, this.computeMetrics(byDebt.get(debt.id) ?? [])),
    );
  }

  /**
   * Agrupa una lista plana de cuotas por su deuda.
   * @param installments - Cuotas de varias deudas (con su debtId).
   * @returns Mapa de debtId a sus cuotas.
   */
  private groupInstallmentsByDebt(installments: InstallmentRow[]): Map<string, InstallmentRow[]> {
    const byDebt = new Map<string, InstallmentRow[]>();
    for (const row of installments) {
      const list = byDebt.get(row.debtId) ?? [];
      list.push(row);
      byDebt.set(row.debtId, list);
    }
    return byDebt;
  }

  /**
   * Calcula las metricas de pago de una deuda a partir de su cronograma.
   * El saldo es la suma del capital de las cuotas no pagadas; la cuota y el
   * interes del mes corresponden a la proxima cuota pendiente.
   * @param installments - Cuotas de la deuda, ordenadas por numero.
   * @returns Saldo actual, cuota, interes del mes y conteo de cuotas.
   */
  private computeMetrics(installments: InstallmentRow[]): DebtMetrics {
    const pending = installments.filter((row) => row.status !== 'pagada');
    const next = pending[0];
    return {
      currentBalance: this.sumBy(pending, (row) => Number(row.principalPortion)),
      monthlyPayment: next ? Number(next.totalAmount) : 0,
      monthlyInterestCost: next ? Number(next.interestPortion) : 0,
      paidInstallments: installments.length - pending.length,
      remainingInstallments: pending.length,
    };
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
      ...this.toDebtResponse(debt, this.computeMetrics(installments)),
      installments: installmentDtos,
      totalInterest: this.sumBy(installmentDtos, (i) => i.interestPortion),
      totalInsurance: this.sumBy(installmentDtos, (i) => i.insurancePortion),
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
    const current = await this.debtsRepository.findByIdForUser(id, userId);
    if (!current) {
      throw new NotFoundException('Deuda no encontrada.');
    }
    if (current.source === 'open_finance') {
      throw new ConflictException(
        'Esta deuda está vinculada a un banco por Open Finance y no se edita a mano.',
      );
    }
    const updated = await this.debtsRepository.update(id, userId, {
      creditor: dto.creditor,
      status: dto.status,
    });
    if (!updated) {
      throw new NotFoundException('Deuda no encontrada.');
    }
    const installments = await this.debtsRepository.findInstallments(updated.id);
    return this.toDebtResponse(updated, this.computeMetrics(installments));
  }

  /**
   * Elimina (soft delete) una deuda del usuario.
   * @param userId - Dueno de la deuda.
   * @param id - UUID de la deuda.
   * @throws NotFoundException si no existe o no pertenece al usuario.
   */
  async remove(userId: string, id: string): Promise<void> {
    const current = await this.debtsRepository.findByIdForUser(id, userId);
    if (!current) {
      throw new NotFoundException('Deuda no encontrada.');
    }
    if (current.source === 'open_finance') {
      throw new ConflictException(
        'Esta deuda está vinculada a un banco por Open Finance y no se edita a mano.',
      );
    }
    await this.debtsRepository.softDelete(id, userId);
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
  private toDebtResponse(debt: DebtRow, metrics: DebtMetrics): DebtResponseDto {
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
      insuranceMode: debt.insuranceMode,
      insuranceValue: debt.insuranceValue === null ? null : Number(debt.insuranceValue),
      interestMode: debt.interestMode,
      status: debt.status,
      source: debt.source,
      createdAt: debt.createdAt,
      currentBalance: metrics.currentBalance,
      monthlyPayment: metrics.monthlyPayment,
      monthlyInterestCost: metrics.monthlyInterestCost,
      paidInstallments: metrics.paidInstallments,
      remainingInstallments: metrics.remainingInstallments,
    };
  }

  /**
   * Mapea una fila de cuota a su DTO de respuesta (montos como numero).
   * @param row - Fila de cuota.
   * @returns El DTO de respuesta.
   */
  private toInstallmentResponse(row: InstallmentRow): InstallmentResponseDto {
    return {
      id: row.id,
      number: row.number,
      dueDate: row.dueDate,
      principalPortion: Number(row.principalPortion),
      interestPortion: Number(row.interestPortion),
      insurancePortion: Number(row.insurancePortion),
      totalAmount: Number(row.totalAmount),
      remainingBalance: Number(row.remainingBalance),
      status: row.status,
    };
  }
}
