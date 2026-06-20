import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountsRepository } from '../accounts/accounts.repository';
import { CategoriesRepository } from '../categories/categories.repository';
import { currentMonth, monthRange } from '../../shared/date/month-range';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import {
  TransactionsRepository,
  TransactionWithCategory,
} from './transactions.repository';

/** Servicio de transacciones (movimientos de ingreso/egreso). */
@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly accountsRepository: AccountsRepository,
  ) {}

  /**
   * Registra un movimiento validando que la categoria sea del usuario.
   * @param userId - Dueno del movimiento.
   * @param dto - Datos del movimiento.
   * @returns El movimiento creado con datos de su categoria.
   * @throws BadRequestException si la categoria no existe o no es del usuario.
   */
  async create(userId: string, dto: CreateTransactionDto): Promise<TransactionResponseDto> {
    const category = await this.categoriesRepository.findByIdForUser(dto.categoryId, userId);
    if (!category) {
      throw new BadRequestException('La categoria no existe o no es del usuario.');
    }
    // Si se indica cuenta, debe existir y ser del usuario.
    let account = null;
    if (dto.accountId) {
      account = await this.accountsRepository.findByIdForUser(dto.accountId, userId);
      if (!account) {
        throw new BadRequestException('La cuenta no existe o no es del usuario.');
      }
    }
    const tx = await this.transactionsRepository.create(userId, {
      categoryId: dto.categoryId,
      accountId: dto.accountId ?? null,
      amount: dto.amount.toFixed(2),
      occurredOn: dto.occurredOn,
      description: dto.description ?? null,
    });
    return {
      id: tx.id,
      categoryId: category.id,
      categoryName: category.name,
      categoryType: category.type,
      categoryColor: category.color,
      accountId: account?.id ?? null,
      accountName: account?.name ?? null,
      amount: Number(tx.amount),
      occurredOn: tx.occurredOn,
      description: tx.description,
    };
  }

  /**
   * Lista los movimientos de un mes (por defecto, el mes actual).
   * @param userId - Dueno de los movimientos.
   * @param month - Mes en formato YYYY-MM (opcional).
   * @returns Los movimientos del periodo.
   */
  async findByMonth(userId: string, month?: string): Promise<TransactionResponseDto[]> {
    const { start, nextStart } = monthRange(month ?? currentMonth());
    const rows = await this.transactionsRepository.findByUserAndMonth(userId, start, nextStart);
    return rows.map((row) => this.toResponse(row));
  }

  /**
   * Elimina un movimiento del usuario.
   * @param userId - Dueno del movimiento.
   * @param id - UUID del movimiento.
   * @throws NotFoundException si no existe o no es del usuario.
   */
  async remove(userId: string, id: string): Promise<void> {
    const deletedId = await this.transactionsRepository.delete(id, userId);
    if (!deletedId) {
      throw new NotFoundException('Movimiento no encontrado.');
    }
  }

  /**
   * Mapea una transaccion (con categoria) a su DTO de respuesta.
   * @param row - Transaccion con categoria embebida.
   * @returns El DTO de respuesta.
   */
  private toResponse(row: TransactionWithCategory): TransactionResponseDto {
    return {
      id: row.id,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryType: row.categoryType,
      categoryColor: row.categoryColor,
      accountId: row.accountId,
      accountName: row.accountName,
      amount: Number(row.amount),
      occurredOn: row.occurredOn,
      description: row.description,
    };
  }
}
