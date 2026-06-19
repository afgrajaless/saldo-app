import { Injectable, NotFoundException } from '@nestjs/common';
import { evaluateUsury } from '../../domain/usury/usury-evaluation';
import { DebtsRepository } from '../debts/debts.repository';
import { DEBT_TYPE_TO_MODALITY } from './debt-modality.map';
import { UsuryEvaluationDto, UsuryRateDto } from './dto/usury.dto';
import { UsuryModality, UsuryRateRow, UsuryRepository } from './usury.repository';

/**
 * Servicio de usura. Consulta el catalogo de topes vigentes y evalua la tasa de
 * una deuda contra el tope de su modalidad usando el motor de dominio.
 */
@Injectable()
export class UsuryService {
  constructor(
    private readonly usuryRepository: UsuryRepository,
    private readonly debtsRepository: DebtsRepository,
  ) {}

  /**
   * Obtiene la tasa de usura vigente para una modalidad y fecha.
   * @param modality - Modalidad de usura.
   * @param date - Fecha a evaluar (YYYY-MM-DD); por defecto, hoy.
   * @returns La tasa vigente.
   * @throws NotFoundException si no hay tasa vigente para ese periodo.
   */
  async getCurrent(modality: UsuryModality, date?: string): Promise<UsuryRateDto> {
    const referenceDate = date ?? this.today();
    const rate = await this.usuryRepository.findCurrent(modality, referenceDate);
    if (!rate) {
      throw new NotFoundException('No hay tasa de usura vigente para la modalidad y fecha indicadas.');
    }
    return this.toRateDto(rate);
  }

  /**
   * Lista el catalogo de tasas, opcionalmente por modalidad.
   * @param modality - Modalidad a filtrar (opcional).
   * @returns Las tasas del catalogo.
   */
  async list(modality?: UsuryModality): Promise<UsuryRateDto[]> {
    const rates = await this.usuryRepository.findAll(modality);
    return rates.map((rate) => this.toRateDto(rate));
  }

  /**
   * Evalua la tasa de una deuda del usuario contra el tope de usura vigente al
   * momento de contratacion (fecha de inicio de la deuda).
   * @param userId - Dueno de la deuda.
   * @param debtId - UUID de la deuda.
   * @returns El resultado de la evaluacion de usura.
   * @throws NotFoundException si la deuda no existe, no es del usuario, o no hay
   *   tope vigente para su modalidad y fecha.
   */
  async evaluateDebt(userId: string, debtId: string): Promise<UsuryEvaluationDto> {
    const debt = await this.debtsRepository.findByIdForUser(debtId, userId);
    if (!debt) {
      throw new NotFoundException('Deuda no encontrada.');
    }
    const modality = DEBT_TYPE_TO_MODALITY[debt.debtType];
    const rate = await this.usuryRepository.findCurrent(modality, debt.startDate);
    if (!rate) {
      throw new NotFoundException('No hay tope de usura registrado para la modalidad y fecha de la deuda.');
    }
    const evaluation = evaluateUsury(
      Number(debt.effectiveAnnualRate),
      Number(rate.effectiveAnnualRate),
    );
    return {
      ...evaluation,
      modality,
      referenceDate: debt.startDate,
    };
  }

  /**
   * Mapea una fila del catalogo a su DTO de respuesta.
   * @param rate - Fila del catalogo.
   * @returns El DTO de la tasa.
   */
  private toRateDto(rate: UsuryRateRow): UsuryRateDto {
    return {
      id: rate.id,
      modality: rate.modality,
      effectiveAnnualRate: Number(rate.effectiveAnnualRate),
      validFrom: rate.validFrom,
      validTo: rate.validTo,
    };
  }

  /**
   * Devuelve la fecha de hoy en formato YYYY-MM-DD.
   * @returns La fecha actual.
   */
  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
