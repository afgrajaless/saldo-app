import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';
import { SettlementsRepository, PersonalTxData, NewSettlementData } from './settlements.repository';
import { AccountsRepository } from '../accounts/accounts.repository';
import { CategoriesRepository } from '../categories/categories.repository';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { SettlementResponseDto } from './dto/settlement-response.dto';

/**
 * Servicio de liquidaciones de deuda entre miembros de un grupo.
 * Valida membresia, miembros participantes y, si se solicita, cuenta/categoria del usuario.
 */
@Injectable()
export class SettlementsService {
  constructor(
    private readonly settlementsRepository: SettlementsRepository,
    private readonly groupsService: GroupsService,
    private readonly groupsRepository: GroupsRepository,
    private readonly accountsRepository: AccountsRepository,
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  /**
   * Registra la liquidacion de una deuda entre dos miembros del grupo.
   * Si dto.recordPersonal esta presente, crea ademas un movimiento personal
   * (egreso si el usuario es el pagador, ingreso si es el receptor) en la misma
   * transaccion atomica.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado que registra la liquidacion.
   * @param dto - Datos de la liquidacion.
   * @returns La liquidacion creada como DTO de respuesta.
   * @throws ForbiddenException si el usuario no es miembro activo del grupo.
   * @throws BadRequestException si fromMemberId === toMemberId.
   * @throws NotFoundException si alguno de los miembros no pertenece al grupo.
   * @throws NotFoundException si la cuenta o categoria no pertenecen al usuario.
   */
  async createSettlement(
    groupId: string,
    userId: string,
    dto: CreateSettlementDto,
  ): Promise<SettlementResponseDto> {
    // Valida que el usuario sea miembro real activo del grupo.
    await this.groupsService.assertActiveMember(groupId, userId);

    // Los dos miembros deben ser distintos.
    if (dto.fromMemberId === dto.toMemberId) {
      throw new BadRequestException('El pagador y el receptor no pueden ser el mismo miembro.');
    }

    // Verifica que fromMemberId y toMemberId sean miembros activos del grupo.
    const allMembers = await this.groupsRepository.listMembers(groupId);
    const memberIds = allMembers.map((m) => m.id);

    if (!memberIds.includes(dto.fromMemberId)) {
      throw new NotFoundException('El miembro pagador no existe en el grupo o fue removido.');
    }
    if (!memberIds.includes(dto.toMemberId)) {
      throw new NotFoundException('El miembro receptor no existe en el grupo o fue removido.');
    }

    // Resuelve el movimiento personal opcional.
    let personalTx: PersonalTxData | undefined;
    if (dto.recordPersonal) {
      const { accountId, categoryId } = dto.recordPersonal;

      // Valida que la cuenta pertenezca al usuario autenticado.
      const account = await this.accountsRepository.findByIdForUser(accountId, userId);
      if (!account) {
        throw new NotFoundException('La cuenta indicada no existe o no te pertenece.');
      }

      // Valida que la categoria pertenezca al usuario autenticado.
      const category = await this.categoriesRepository.findByIdForUser(categoryId, userId);
      if (!category) {
        throw new NotFoundException('La categoria indicada no existe o no te pertenece.');
      }

      // Determina el rol del usuario autenticado: pagador (from) o receptor (to).
      const fromMember = allMembers.find((m) => m.id === dto.fromMemberId);
      const toMember = allMembers.find((m) => m.id === dto.toMemberId);

      let side: 'from' | 'to';
      if (fromMember?.userId === userId) {
        side = 'from'; // egreso: el usuario pago la deuda
      } else if (toMember?.userId === userId) {
        side = 'to'; // ingreso: el usuario cobro la deuda
      } else {
        // El usuario no es ni el pagador ni el receptor real; no se registra movimiento.
        // Se continua sin personalTx para evitar registrar un movimiento incorrecto.
        personalTx = undefined;
        return this.persist(groupId, userId, dto, undefined);
      }

      personalTx = {
        side,
        userId,
        accountId: accountId ?? null,
        categoryId,
      };
    }

    return this.persist(groupId, userId, dto, personalTx);
  }

  /**
   * Lista las liquidaciones de un grupo. Valida que el usuario sea miembro activo.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado.
   * @returns Lista de liquidaciones del grupo.
   * @throws ForbiddenException si el usuario no es miembro activo del grupo.
   */
  async listSettlements(groupId: string, userId: string): Promise<SettlementResponseDto[]> {
    await this.groupsService.assertActiveMember(groupId, userId);
    const rows = await this.settlementsRepository.listSettlements(groupId);
    return rows.map((r) => this.toResponse(r));
  }

  /**
   * Delega la persistencia al repositorio y convierte el resultado en DTO.
   * Metodo auxiliar para evitar duplicacion entre las ramas con y sin personalTx.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario que registra.
   * @param dto - Datos de la liquidacion.
   * @param personalTx - Datos del movimiento personal opcional.
   * @returns La liquidacion creada como DTO de respuesta.
   */
  private async persist(
    groupId: string,
    userId: string,
    dto: CreateSettlementDto,
    personalTx: PersonalTxData | undefined,
  ): Promise<SettlementResponseDto> {
    const data: NewSettlementData = {
      fromMemberId: dto.fromMemberId,
      toMemberId: dto.toMemberId,
      amount: dto.amount,
      settledOn: dto.settledOn,
    };

    const settlement = await this.settlementsRepository.insertSettlement(
      groupId,
      userId,
      data,
      personalTx,
    );

    return this.toResponse(settlement);
  }

  /**
   * Convierte una fila de settlement al DTO de respuesta.
   * Drizzle expone NUMERIC como string; se parsea a numero antes de devolver.
   * @param row - Fila de settlement de la base de datos.
   * @returns El DTO de respuesta.
   */
  private toResponse(row: Awaited<ReturnType<SettlementsRepository['listSettlements']>>[0]): SettlementResponseDto {
    return {
      id: row.id,
      groupId: row.groupId,
      fromMemberId: row.fromMemberId,
      toMemberId: row.toMemberId,
      amount: parseFloat(row.amount),
      settledOn: row.settledOn,
      fromTransactionId: row.fromTransactionId,
      toTransactionId: row.toTransactionId,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
    };
  }
}
