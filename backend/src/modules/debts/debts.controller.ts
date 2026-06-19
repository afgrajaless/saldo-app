import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { DebtDetailDto, DebtResponseDto } from './dto/debt-response.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';

/** CRUD de obligaciones (deudas). Todas las rutas exigen autenticacion. */
@ApiTags('debts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  /**
   * Crea una nueva obligacion y genera su cronograma.
   * @param userId - Usuario autenticado.
   * @param dto - Datos de la deuda.
   * @returns La deuda creada.
   */
  @Post()
  @ApiOperation({ summary: 'Crear una obligacion y generar su cronograma' })
  @ApiResponse({ status: 201, description: 'Deuda creada.', type: DebtResponseDto })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateDebtDto,
  ): Promise<DebtResponseDto> {
    return this.debtsService.create(userId, dto);
  }

  /**
   * Lista las obligaciones del usuario.
   * @param userId - Usuario autenticado.
   * @returns Las deudas del usuario.
   */
  @Get()
  @ApiOperation({ summary: 'Listar las obligaciones del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de deudas.', type: [DebtResponseDto] })
  findAll(@CurrentUser('sub') userId: string): Promise<DebtResponseDto[]> {
    return this.debtsService.findAll(userId);
  }

  /**
   * Obtiene una obligacion con su cronograma y totales.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la deuda.
   * @returns El detalle de la deuda.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una obligacion con su cronograma' })
  @ApiParam({ name: 'id', description: 'UUID de la deuda', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Detalle de la deuda.', type: DebtDetailDto })
  @ApiResponse({ status: 404, description: 'Deuda no encontrada.' })
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DebtDetailDto> {
    return this.debtsService.findOne(userId, id);
  }

  /**
   * Actualiza el acreedor y/o el estado de una obligacion.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la deuda.
   * @param dto - Campos a actualizar.
   * @returns La deuda actualizada.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar acreedor o estado de una obligacion' })
  @ApiParam({ name: 'id', description: 'UUID de la deuda', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Deuda actualizada.', type: DebtResponseDto })
  @ApiResponse({ status: 404, description: 'Deuda no encontrada.' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDebtDto,
  ): Promise<DebtResponseDto> {
    return this.debtsService.update(userId, id, dto);
  }

  /**
   * Elimina (soft delete) una obligacion.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la deuda.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una obligacion (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID de la deuda', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Deuda eliminada.' })
  @ApiResponse({ status: 404, description: 'Deuda no encontrada.' })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.debtsService.remove(userId, id);
  }
}
