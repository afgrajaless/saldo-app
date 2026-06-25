import { Injectable, NotFoundException } from '@nestjs/common';
import { CardResponseDto } from './dto/card-response.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CardRow, CardsRepository } from './cards.repository';

/** Servicio de tarjetas de credito (CRUD aislado por usuario). */
@Injectable()
export class CardsService {
  constructor(private readonly cardsRepository: CardsRepository) {}

  /**
   * Crea una tarjeta de credito con sus parametros de configuracion.
   * @param userId - Dueno de la tarjeta.
   * @param dto - Datos de la tarjeta.
   * @returns La tarjeta creada.
   */
  async createCard(userId: string, dto: CreateCardDto): Promise<CardResponseDto> {
    const card = await this.cardsRepository.createCard(userId, dto);
    return this.toResponse(card);
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
    return this.toResponse(updated);
  }

  /**
   * Obtiene los datos de una tarjeta del usuario.
   * @param userId - Dueno de la tarjeta.
   * @param accountId - UUID de la tarjeta.
   * @returns La tarjeta.
   * @throws NotFoundException si la tarjeta no existe o no es del usuario.
   */
  async findOne(userId: string, accountId: string): Promise<CardResponseDto> {
    const card = await this.cardsRepository.findCardForUser(accountId, userId);
    if (!card) {
      throw new NotFoundException('Tarjeta de credito no encontrada.');
    }
    return this.toResponse(card);
  }

  /**
   * Lista todas las tarjetas activas del usuario.
   * @param userId - Dueno de las tarjetas.
   * @returns Lista de tarjetas.
   */
  async listCards(userId: string): Promise<CardResponseDto[]> {
    const cards = await this.cardsRepository.listCards(userId);
    return cards.map((c) => this.toResponse(c));
  }

  /**
   * Mapea una fila combinada de tarjeta a su DTO de respuesta.
   * @param card - Fila combinada accounts + credit_card_details.
   * @returns El DTO de respuesta.
   */
  private toResponse(card: CardRow): CardResponseDto {
    return {
      id: card.id,
      name: card.name,
      color: card.color,
      creditLimit: Number(card.creditLimit),
      statementDay: card.statementDay,
      paymentDay: card.paymentDay,
      rotativoRateEa: Number(card.rotativoRateEa),
      minPaymentPct: Number(card.minPaymentPct),
      managementFee: card.managementFee !== null ? Number(card.managementFee) : null,
      managementFeePeriod: card.managementFeePeriod,
      createdAt: card.createdAt,
    };
  }
}
