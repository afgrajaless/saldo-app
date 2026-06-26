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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferResponseDto } from './dto/transfer-response.dto';
import { TransfersService } from './transfers.service';

/** Transferencias entre cuentas. Todas las rutas exigen autenticacion. */
@ApiTags('transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  /**
   * Registra una transferencia entre cuentas.
   * @param userId - Usuario autenticado.
   * @param dto - Datos de la transferencia.
   * @returns La transferencia creada.
   */
  @Post()
  @ApiOperation({ summary: 'Registrar una transferencia entre cuentas' })
  @ApiResponse({ status: 201, description: 'Transferencia creada.', type: TransferResponseDto })
  @ApiResponse({ status: 400, description: 'Cuentas inválidas o iguales.' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTransferDto,
  ): Promise<TransferResponseDto> {
    return this.transfersService.create(userId, dto);
  }

  /**
   * Lista las transferencias de un mes.
   * @param userId - Usuario autenticado.
   * @param month - Mes en formato YYYY-MM (opcional).
   * @returns Las transferencias del periodo.
   */
  @Get()
  @ApiOperation({ summary: 'Listar las transferencias de un mes' })
  @ApiQuery({ name: 'month', required: false, description: 'Mes YYYY-MM (por defecto, el actual).' })
  @ApiResponse({ status: 200, description: 'Lista de transferencias.', type: [TransferResponseDto] })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query('month') month?: string,
  ): Promise<TransferResponseDto[]> {
    return this.transfersService.findByMonth(userId, month);
  }

  /**
   * Elimina una transferencia.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la transferencia.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una transferencia' })
  @ApiParam({ name: 'id', description: 'UUID de la transferencia', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Transferencia eliminada.' })
  @ApiResponse({ status: 404, description: 'Transferencia no encontrada.' })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.transfersService.remove(userId, id);
  }
}
