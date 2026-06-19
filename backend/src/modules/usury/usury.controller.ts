import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUsuryQueryDto,
  ListUsuryQueryDto,
  UsuryEvaluationDto,
  UsuryRateDto,
} from './dto/usury.dto';
import { UsuryService } from './usury.service';

/** Catalogo de usura y evaluacion de deudas contra el tope vigente. */
@ApiTags('usury')
@Controller('usury')
export class UsuryController {
  constructor(private readonly usuryService: UsuryService) {}

  /**
   * Lista el catalogo de tasas de usura.
   * @param query - Filtro opcional por modalidad.
   * @returns Las tasas del catalogo.
   */
  @Get()
  @ApiOperation({ summary: 'Listar el catalogo de tasas de usura' })
  @ApiResponse({ status: 200, description: 'Catalogo de tasas.', type: [UsuryRateDto] })
  list(@Query() query: ListUsuryQueryDto): Promise<UsuryRateDto[]> {
    return this.usuryService.list(query.modality);
  }

  /**
   * Consulta la tasa de usura vigente para una modalidad y fecha.
   * @param query - Modalidad y fecha (opcional).
   * @returns La tasa vigente.
   */
  @Get('current')
  @ApiOperation({ summary: 'Consultar la tasa de usura vigente' })
  @ApiResponse({ status: 200, description: 'Tasa vigente.', type: UsuryRateDto })
  @ApiResponse({ status: 404, description: 'Sin tasa vigente para el periodo.' })
  getCurrent(@Query() query: CurrentUsuryQueryDto): Promise<UsuryRateDto> {
    return this.usuryService.getCurrent(query.modality, query.date);
  }

  /**
   * Evalua la tasa de una deuda del usuario contra el tope de usura.
   * @param userId - Usuario autenticado.
   * @param debtId - UUID de la deuda.
   * @returns El resultado de la evaluacion.
   */
  @Get('debts/:debtId/evaluate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Evaluar una deuda contra el tope de usura' })
  @ApiParam({ name: 'debtId', description: 'UUID de la deuda', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Resultado de la evaluacion.', type: UsuryEvaluationDto })
  @ApiResponse({ status: 404, description: 'Deuda o tope no encontrado.' })
  evaluateDebt(
    @CurrentUser('sub') userId: string,
    @Param('debtId', ParseUUIDPipe) debtId: string,
  ): Promise<UsuryEvaluationDto> {
    return this.usuryService.evaluateDebt(userId, debtId);
  }
}
