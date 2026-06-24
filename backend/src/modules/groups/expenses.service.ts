import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { splitEqual, validateExact, MemberShare } from '../../domain/split/split-expense';
import { ExpensesRepository, ExpenseUpdateFields, SharedExpenseRow, SharedExpenseShareRow } from './expenses.repository';
import { GroupsService } from './groups.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseResponseDto, ShareResponseDto } from './dto/expense-response.dto';

/**
 * Servicio de gastos compartidos dentro de grupos.
 * Valida membresia y logica de reparto antes de persistir.
 */
@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly groupsService: GroupsService,
  ) {}

  /**
   * Valida que el pagador indicado sea un miembro activo del grupo.
   * Centraliza la verificacion para ser reutilizada en create y update.
   * @param paidByMemberId - UUID del miembro que pago el gasto.
   * @param memberIds - IDs de todos los miembros activos del grupo.
   * @throws BadRequestException si el pagador no pertenece al grupo.
   */
  private assertPaidByMemberBelongsToGroup(paidByMemberId: string, memberIds: string[]): void {
    if (!memberIds.includes(paidByMemberId)) {
      throw new BadRequestException('El miembro pagador no pertenece al grupo o fue removido.');
    }
  }

  /**
   * Crea un gasto compartido en el grupo. Valida que el usuario sea miembro activo,
   * que el pagador sea miembro del grupo y calcula las partes segun el metodo de reparto.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado que registra el gasto.
   * @param dto - Datos del gasto a crear.
   * @returns El gasto creado con sus partes.
   * @throws ForbiddenException si el usuario no es miembro activo.
   * @throws BadRequestException si los datos de reparto son invalidos.
   */
  async createExpense(
    groupId: string,
    userId: string,
    dto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    // Verifica que el usuario autenticado sea miembro real activo del grupo.
    await this.groupsService.assertActiveMember(groupId, userId);

    // Obtiene los miembros activos para validar pagador y participantes.
    const members = await this.groupsService.listMembers(groupId, userId);
    const memberIds = members.map((m) => m.id);

    // Valida que el pagador sea miembro activo del grupo.
    this.assertPaidByMemberBelongsToGroup(dto.paidByMemberId, memberIds);

    // Calcula las partes segun el metodo de reparto seleccionado.
    const shares = this.resolveShares(dto, memberIds);

    // Persiste el gasto y sus partes en una sola transaccion.
    const expense = await this.expensesRepository.insertExpenseWithShares(
      groupId,
      userId,
      {
        paidByMemberId: dto.paidByMemberId,
        amount: dto.amount,
        description: dto.description,
        occurredOn: dto.occurredOn,
        splitMethod: dto.splitMethod,
      },
      shares,
    );

    const savedShares = await this.expensesRepository.findExpenseShares(expense.id);
    return this.toResponse(expense, savedShares);
  }

  /**
   * Lista los gastos activos de un grupo. Valida que el usuario sea miembro activo.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado.
   * @returns Lista de gastos activos del grupo con sus partes.
   * @throws ForbiddenException si el usuario no es miembro activo.
   */
  async listExpenses(groupId: string, userId: string): Promise<ExpenseResponseDto[]> {
    await this.groupsService.assertActiveMember(groupId, userId);
    const expenses = await this.expensesRepository.listExpenses(groupId);

    if (expenses.length === 0) return [];

    // Obtiene todas las partes en una sola consulta para evitar N+1.
    const expenseIds = expenses.map((e) => e.id);
    const allShares = await this.expensesRepository.findSharesForExpenses(expenseIds);

    // Agrupa las partes por expenseId en memoria para asignacion O(n).
    const sharesByExpense = new Map<string, SharedExpenseShareRow[]>();
    for (const share of allShares) {
      const list = sharesByExpense.get(share.expenseId) ?? [];
      list.push(share);
      sharesByExpense.set(share.expenseId, list);
    }

    return expenses.map((expense) =>
      this.toResponse(expense, sharesByExpense.get(expense.id) ?? []),
    );
  }

  /**
   * Actualiza los campos editables de un gasto. Recalcula las partes si se cambia
   * el monto o el metodo de reparto. Revalida el pagador si se incluye en el DTO.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado.
   * @param expenseId - UUID del gasto a actualizar.
   * @param dto - Campos a actualizar (PartialType de CreateExpenseDto).
   * @returns El gasto actualizado con sus partes.
   * @throws ForbiddenException si el usuario no es miembro activo.
   * @throws NotFoundException si el gasto no existe.
   * @throws BadRequestException si el pagador o los participantes no pertenecen al grupo.
   */
  async updateExpense(
    groupId: string,
    userId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    await this.groupsService.assertActiveMember(groupId, userId);

    const existing = await this.expensesRepository.findExpense(groupId, expenseId);
    if (!existing) {
      throw new NotFoundException('Gasto no encontrado en el grupo.');
    }

    // Obtiene los miembros activos una sola vez para validar pagador y participantes.
    const members = await this.groupsService.listMembers(groupId, userId);
    const memberIds = members.map((m) => m.id);

    // Revalida el pagador si se incluye en el DTO para evitar corrupcion de saldos.
    if (dto.paidByMemberId !== undefined) {
      this.assertPaidByMemberBelongsToGroup(dto.paidByMemberId, memberIds);
    }

    // Solo recalcula las partes si se cambia el monto, metodo de reparto o participantes.
    let newShares: MemberShare[] | undefined;
    if (dto.amount !== undefined || dto.splitMethod !== undefined || dto.participantMemberIds || dto.exactShares) {
      const effectiveDto: CreateExpenseDto = {
        paidByMemberId: dto.paidByMemberId ?? existing.paidByMemberId,
        amount: dto.amount ?? parseFloat(existing.amount),
        occurredOn: dto.occurredOn ?? existing.occurredOn,
        splitMethod: dto.splitMethod ?? (existing.splitMethod as 'equal' | 'exact'),
        description: dto.description,
        participantMemberIds: dto.participantMemberIds,
        exactShares: dto.exactShares,
      };
      newShares = this.resolveShares(effectiveDto, memberIds);
    }

    const fields: ExpenseUpdateFields = {};
    if (dto.description !== undefined) fields.description = dto.description ?? null;
    if (dto.amount !== undefined) fields.amount = dto.amount.toFixed(2);
    if (dto.occurredOn !== undefined) fields.occurredOn = dto.occurredOn;
    if (dto.paidByMemberId !== undefined) fields.paidByMemberId = dto.paidByMemberId;
    if (dto.splitMethod !== undefined) fields.splitMethod = dto.splitMethod;

    const updated = await this.expensesRepository.updateExpense(
      groupId,
      expenseId,
      fields,
      newShares,
    );
    const shares = await this.expensesRepository.findExpenseShares(updated.id);
    return this.toResponse(updated, shares);
  }

  /**
   * Elimina un gasto compartido (soft delete). Valida que el usuario sea miembro activo.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado.
   * @param expenseId - UUID del gasto a eliminar.
   * @throws ForbiddenException si el usuario no es miembro activo.
   * @throws NotFoundException si el gasto no existe.
   */
  async softDeleteExpense(groupId: string, userId: string, expenseId: string): Promise<void> {
    await this.groupsService.assertActiveMember(groupId, userId);
    await this.expensesRepository.softDeleteExpense(groupId, expenseId);
  }

  /**
   * Calcula las partes del gasto segun el metodo de reparto indicado en el DTO.
   * Envuelve los errores de dominio en BadRequestException con mensaje en espanol.
   * @param dto - Datos del gasto con el metodo de reparto y los participantes.
   * @param allGroupMemberIds - IDs de todos los miembros activos del grupo.
   * @returns Lista de partes calculadas.
   * @throws BadRequestException si los datos de reparto son invalidos.
   */
  private resolveShares(dto: CreateExpenseDto, allGroupMemberIds: string[]): MemberShare[] {
    try {
      if (dto.splitMethod === 'equal') {
        const participants = dto.participantMemberIds ?? allGroupMemberIds;
        // Valida que todos los participantes sean miembros activos del grupo.
        const invalidIds = participants.filter((id) => !allGroupMemberIds.includes(id));
        if (invalidIds.length > 0) {
          throw new BadRequestException(
            `Los siguientes participantes no son miembros activos del grupo: ${invalidIds.join(', ')}`,
          );
        }
        return splitEqual(dto.amount, participants);
      }

      // splitMethod === 'exact'
      if (!dto.exactShares || dto.exactShares.length === 0) {
        throw new BadRequestException(
          'Para reparto exacto debes proveer al menos una parte en exactShares.',
        );
      }
      // Valida que todos los miembros en exactShares sean miembros activos del grupo.
      const invalidExactIds = dto.exactShares
        .map((s) => s.memberId)
        .filter((id) => !allGroupMemberIds.includes(id));
      if (invalidExactIds.length > 0) {
        throw new BadRequestException(
          `Los siguientes participantes no son miembros activos del grupo: ${invalidExactIds.join(', ')}`,
        );
      }
      validateExact(dto.amount, dto.exactShares);
      return dto.exactShares;
    } catch (err: unknown) {
      // Re-lanza BadRequestException tal cual; envuelve Error de dominio.
      if (err instanceof BadRequestException) throw err;
      if (err instanceof Error) {
        throw new BadRequestException(err.message);
      }
      throw new BadRequestException('Error al calcular el reparto del gasto.');
    }
  }

  /**
   * Convierte una fila de gasto y sus partes al DTO de respuesta.
   * @param expense - Fila de gasto compartido.
   * @param shares - Filas de partes del gasto.
   * @returns El DTO de respuesta con el gasto y sus partes.
   */
  private toResponse(
    expense: SharedExpenseRow,
    shares: SharedExpenseShareRow[],
  ): ExpenseResponseDto {
    const sharesDtos: ShareResponseDto[] = shares.map((s) => ({
      id: s.id,
      memberId: s.memberId,
      shareAmount: parseFloat(s.shareAmount),
    }));

    return {
      id: expense.id,
      groupId: expense.groupId,
      paidByMemberId: expense.paidByMemberId,
      description: expense.description,
      amount: parseFloat(expense.amount),
      occurredOn: expense.occurredOn,
      splitMethod: expense.splitMethod as 'equal' | 'exact',
      createdByUserId: expense.createdByUserId,
      createdAt: expense.createdAt,
      shares: sharesDtos,
    };
  }
}
