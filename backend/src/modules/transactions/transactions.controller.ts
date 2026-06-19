import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { TransactionsService } from './transactions.service';

/** Movimientos de ingreso/egreso. Todas las rutas exigen autenticacion. */
@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Registra un movimiento.
   * @param userId - Usuario autenticado.
   * @param dto - Datos del movimiento.
   * @returns El movimiento creado.
   */
  @Post()
  @ApiOperation({ summary: 'Registrar un ingreso o egreso' })
  @ApiResponse({ status: 201, description: 'Movimiento creado.', type: TransactionResponseDto })
  @ApiResponse({ status: 400, description: 'Categoria invalida.' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.create(userId, dto);
  }

  /**
   * Lista los movimientos de un mes.
   * @param userId - Usuario autenticado.
   * @param query - Mes a consultar (opcional).
   * @returns Los movimientos del periodo.
   */
  @Get()
  @ApiOperation({ summary: 'Listar movimientos de un mes' })
  @ApiResponse({ status: 200, description: 'Lista de movimientos.', type: [TransactionResponseDto] })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: ListTransactionsQueryDto,
  ): Promise<TransactionResponseDto[]> {
    return this.transactionsService.findByMonth(userId, query.month);
  }

  /**
   * Elimina un movimiento.
   * @param userId - Usuario autenticado.
   * @param id - UUID del movimiento.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un movimiento' })
  @ApiParam({ name: 'id', description: 'UUID del movimiento', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Movimiento eliminado.' })
  @ApiResponse({ status: 404, description: 'Movimiento no encontrado.' })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.transactionsService.remove(userId, id);
  }
}
