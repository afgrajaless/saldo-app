import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CardsService } from './cards.service';
import { CardResponseDto } from './dto/card-response.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { ReconcileStatementDto } from './dto/reconcile-statement.dto';
import { StatementResponseDto } from './dto/statement-response.dto';
import { UpdateCardDto } from './dto/update-card.dto';

/** CRUD de tarjetas de credito. Todas las rutas exigen autenticacion. */
@ApiTags('cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  /**
   * Crea una tarjeta de credito con sus parametros de configuracion.
   * @param userId - Usuario autenticado.
   * @param dto - Datos de la tarjeta.
   * @returns La tarjeta creada.
   */
  @Post()
  @ApiOperation({ summary: 'Crear una tarjeta de credito' })
  @ApiResponse({ status: 201, description: 'Tarjeta creada.', type: CardResponseDto })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCardDto,
  ): Promise<CardResponseDto> {
    return this.cardsService.createCard(userId, dto);
  }

  /**
   * Lista todas las tarjetas activas del usuario autenticado.
   * @param userId - Usuario autenticado.
   * @returns Lista de tarjetas.
   */
  @Get()
  @ApiOperation({ summary: 'Listar las tarjetas de credito del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de tarjetas.', type: [CardResponseDto] })
  findAll(@CurrentUser('sub') userId: string): Promise<CardResponseDto[]> {
    return this.cardsService.listCards(userId);
  }

  /**
   * Obtiene los datos de una tarjeta del usuario.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la tarjeta.
   * @returns La tarjeta.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una tarjeta de credito por id' })
  @ApiParam({ name: 'id', description: 'UUID de la tarjeta', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tarjeta encontrada.', type: CardResponseDto })
  @ApiResponse({ status: 404, description: 'Tarjeta no encontrada.' })
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CardResponseDto> {
    return this.cardsService.findOne(userId, id);
  }

  /**
   * Actualiza los campos de una tarjeta del usuario.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la tarjeta.
   * @param dto - Campos a actualizar.
   * @returns La tarjeta actualizada.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una tarjeta de credito' })
  @ApiParam({ name: 'id', description: 'UUID de la tarjeta', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tarjeta actualizada.', type: CardResponseDto })
  @ApiResponse({ status: 404, description: 'Tarjeta no encontrada.' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCardDto,
  ): Promise<CardResponseDto> {
    return this.cardsService.updateCard(userId, id, dto);
  }

  /**
   * Obtiene el extracto estimado del ciclo actual de una tarjeta.
   * Si ya existe un extracto guardado para la fecha de corte, lo devuelve directamente.
   * En caso contrario, calcula cargos, cuotas diferidas, intereses rotativos y cuota de manejo,
   * persiste el resultado y lo retorna con status 'open'.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la tarjeta.
   * @returns El extracto estimado del ciclo actual.
   */
  @Get(':id/statement')
  @ApiOperation({ summary: 'Obtener el extracto estimado del ciclo actual de una tarjeta' })
  @ApiParam({ name: 'id', description: 'UUID de la tarjeta', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Extracto del ciclo.', type: StatementResponseDto })
  @ApiResponse({ status: 404, description: 'Tarjeta no encontrada.' })
  getStatement(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StatementResponseDto> {
    return this.cardsService.getStatement(id, userId);
  }

  /**
   * Reconcilia el extracto oficial del banco con los valores reales del extracto.
   * Actualiza (o crea) el extracto con los montos reconciliados y cambia su estado.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la tarjeta.
   * @param dto - Valores reales del extracto del banco.
   * @returns El extracto reconciliado.
   */
  @Post(':id/statement/reconcile')
  @ApiOperation({ summary: 'Reconciliar el extracto oficial con los valores reales del banco' })
  @ApiParam({ name: 'id', description: 'UUID de la tarjeta', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Extracto reconciliado.', type: StatementResponseDto })
  @ApiResponse({ status: 400, description: 'Montos negativos o fecha invalida.' })
  @ApiResponse({ status: 404, description: 'Tarjeta no encontrada.' })
  reconcileStatement(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReconcileStatementDto,
  ): Promise<StatementResponseDto> {
    return this.cardsService.reconcileStatement(id, userId, dto);
  }
}
