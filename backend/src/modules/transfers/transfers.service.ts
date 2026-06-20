import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountsRepository } from '../accounts/accounts.repository';
import { currentMonth, monthRange } from '../../shared/date/month-range';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferResponseDto } from './dto/transfer-response.dto';
import { TransfersRepository, TransferWithAccounts } from './transfers.repository';

/** Servicio de transferencias entre cuentas. */
@Injectable()
export class TransfersService {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly accountsRepository: AccountsRepository,
  ) {}

  /**
   * Registra una transferencia validando que ambas cuentas sean del usuario y
   * distintas entre si.
   * @param userId - Dueno de la transferencia.
   * @param dto - Datos de la transferencia.
   * @returns La transferencia creada con los nombres de las cuentas.
   * @throws BadRequestException si las cuentas son iguales o no son del usuario.
   */
  async create(userId: string, dto: CreateTransferDto): Promise<TransferResponseDto> {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('La cuenta de origen y destino deben ser distintas.');
    }
    const [from, to] = await Promise.all([
      this.accountsRepository.findByIdForUser(dto.fromAccountId, userId),
      this.accountsRepository.findByIdForUser(dto.toAccountId, userId),
    ]);
    if (!from || !to) {
      throw new BadRequestException('Alguna de las cuentas no existe o no es del usuario.');
    }
    const transfer = await this.transfersRepository.create(userId, {
      fromAccountId: dto.fromAccountId,
      toAccountId: dto.toAccountId,
      amount: dto.amount.toFixed(2),
      occurredOn: dto.occurredOn,
      description: dto.description ?? null,
    });
    return {
      id: transfer.id,
      fromAccountId: from.id,
      toAccountId: to.id,
      fromAccountName: from.name,
      toAccountName: to.name,
      amount: Number(transfer.amount),
      occurredOn: transfer.occurredOn,
      description: transfer.description,
    };
  }

  /**
   * Lista las transferencias de un mes (por defecto, el mes actual).
   * @param userId - Dueno de las transferencias.
   * @param month - Mes en formato YYYY-MM (opcional).
   * @returns Las transferencias del periodo.
   */
  async findByMonth(userId: string, month?: string): Promise<TransferResponseDto[]> {
    const { start, nextStart } = monthRange(month ?? currentMonth());
    const rows = await this.transfersRepository.findByUserAndMonth(userId, start, nextStart);
    return rows.map((row) => this.toResponse(row));
  }

  /**
   * Elimina una transferencia del usuario.
   * @param userId - Dueno de la transferencia.
   * @param id - UUID de la transferencia.
   * @throws NotFoundException si no existe o no es del usuario.
   */
  async remove(userId: string, id: string): Promise<void> {
    const deletedId = await this.transfersRepository.delete(id, userId);
    if (!deletedId) {
      throw new NotFoundException('Transferencia no encontrada.');
    }
  }

  /**
   * Mapea una transferencia (con cuentas) a su DTO de respuesta.
   * @param row - Transferencia con nombres de cuentas embebidos.
   * @returns El DTO de respuesta.
   */
  private toResponse(row: TransferWithAccounts): TransferResponseDto {
    return {
      id: row.id,
      fromAccountId: row.fromAccountId,
      toAccountId: row.toAccountId,
      fromAccountName: row.fromAccountName,
      toAccountName: row.toAccountName,
      amount: Number(row.amount),
      occurredOn: row.occurredOn,
      description: row.description,
    };
  }
}
