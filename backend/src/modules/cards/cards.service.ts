import { Injectable, NotFoundException } from '@nestjs/common';
import { computeCycleDates } from '../../domain/card/card-dates';
import { evaluateUsury } from '../../domain/usury/usury-evaluation';
import { UsuryRepository } from '../usury/usury.repository';
import { CardResponseDto } from './dto/card-response.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CardRow, CardsRepository } from './cards.repository';

/** Modalidad de usura usada para tarjetas de credito (consumo y ordinario). */
const CREDIT_CARD_USURY_MODALITY = 'consumo_ordinario' as const;

/** Servicio de tarjetas de credito (CRUD + saldo + alerta de usura). */
@Injectable()
export class CardsService {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly usuryRepository: UsuryRepository,
  ) {}

  /**
   * Crea una tarjeta de credito con sus parametros de configuracion.
   * @param userId - Dueno de la tarjeta.
   * @param dto - Datos de la tarjeta.
   * @returns La tarjeta creada con saldo inicial en cero.
   */
  async createCard(userId: string, dto: CreateCardDto): Promise<CardResponseDto> {
    const card = await this.cardsRepository.createCard(userId, dto);
    return this.toEnrichedResponse(card);
  }

  /**
   * Actualiza los campos de una tarjeta del usuario.
   * @param userId - Dueno de la tarjeta.
   * @param accountId - UUID de la tarjeta.
   * @param dto - Campos a actualizar.
   * @returns La tarjeta actualizada.
   * @throws NotFoundException si la tarjeta no existe o no es del usuario.
   */
  async updateCard(userId: string, accountId: string, dto: UpdateCardDto): Promise<CardResponseDto> {
    const existing = await this.cardsRepository.findCardForUser(accountId, userId);
    if (!existing) {
      throw new NotFoundException('Tarjeta de credito no encontrada.');
    }
    const updated = await this.cardsRepository.updateCard(accountId, userId, dto);
    if (!updated) {
      throw new NotFoundException('Tarjeta de credito no encontrada.');
    }
    return this.toEnrichedResponse(updated);
  }

  /**
   * Obtiene los datos de una tarjeta del usuario con saldo y alerta de usura.
   * @param userId - Dueno de la tarjeta.
   * @param accountId - UUID de la tarjeta.
   * @returns La tarjeta enriquecida con saldo, cupo disponible y alerta de usura.
   * @throws NotFoundException si la tarjeta no existe o no es del usuario.
   */
  async findOne(userId: string, accountId: string): Promise<CardResponseDto> {
    const card = await this.cardsRepository.findCardForUser(accountId, userId);
    if (!card) {
      throw new NotFoundException('Tarjeta de credito no encontrada.');
    }
    return this.toEnrichedResponse(card);
  }

  /**
   * Lista todas las tarjetas activas del usuario, enriquecidas con saldo actual,
   * cupo disponible, fecha de proximo pago y alerta de usura.
   * @param userId - Dueno de las tarjetas.
   * @returns Lista de tarjetas enriquecidas.
   */
  async listCards(userId: string): Promise<CardResponseDto[]> {
    const cards = await this.cardsRepository.listCards(userId);
    return Promise.all(cards.map((c) => this.toEnrichedResponse(c)));
  }

  /**
   * Calcula el saldo adeudado de una tarjeta: cargos totales menos pagos recibidos.
   * Un saldo negativo (mas pagos que cargos) se ajusta a cero.
   * @param accountId - UUID de la tarjeta.
   * @returns Saldo adeudado en pesos.
   */
  async getCardBalance(accountId: string): Promise<number> {
    const [charges, payments] = await Promise.all([
      this.cardsRepository.sumCardCharges(accountId),
      this.cardsRepository.sumCardPayments(accountId),
    ]);
    return Math.max(0, charges - payments);
  }

  /**
   * Mapea una fila combinada de tarjeta a su DTO de respuesta enriquecido.
   * Consulta en paralelo el saldo y la tasa de usura vigente, luego calcula
   * el cupo disponible, la fecha de proximo pago y la alerta de usura.
   * @param card - Fila combinada accounts + credit_card_details.
   * @returns El DTO de respuesta enriquecido.
   */
  private async toEnrichedResponse(card: CardRow): Promise<CardResponseDto> {
    const today = new Date().toISOString().slice(0, 7); // YYYY-MM

    const [usedAmount, usuryRate] = await Promise.all([
      this.getCardBalance(card.id),
      this.usuryRepository.findCurrent(CREDIT_CARD_USURY_MODALITY, new Date().toISOString().slice(0, 10)),
    ]);

    const creditLimit = Number(card.creditLimit);
    const available = Math.max(0, creditLimit - usedAmount);

    const { paymentDueDate } = computeCycleDates(card.statementDay, card.paymentDay, today);

    let exceedsUsury = false;
    if (usuryRate) {
      const rotativoEa = Number(card.rotativoRateEa);
      const usuryCap = Number(usuryRate.effectiveAnnualRate);
      if (usuryCap > 0) {
        const evaluation = evaluateUsury(rotativoEa, usuryCap);
        exceedsUsury = evaluation.isUsurious;
      }
    }

    return {
      id: card.id,
      name: card.name,
      color: card.color,
      creditLimit,
      statementDay: card.statementDay,
      paymentDay: card.paymentDay,
      rotativoRateEa: Number(card.rotativoRateEa),
      minPaymentPct: Number(card.minPaymentPct),
      managementFee: card.managementFee !== null ? Number(card.managementFee) : null,
      managementFeePeriod: card.managementFeePeriod,
      usedAmount,
      available,
      paymentDueDate,
      exceedsUsury,
      createdAt: card.createdAt,
    };
  }
}
