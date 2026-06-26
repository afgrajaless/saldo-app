import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectionResponseDto } from './dto/connection-response.dto';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { FinalizeConnectionDto } from './dto/finalize-connection.dto';
import { InstitutionDto } from './dto/institution.dto';
import { SyncSummaryDto } from './dto/sync-summary.dto';
import { WidgetTokenDto } from './dto/widget-token.dto';
import { OpenFinanceService } from './open-finance.service';

/** Conexiones y sincronización con Open Finance. Requiere autenticación. */
@ApiTags('open-finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('open-finance')
export class OpenFinanceController {
  constructor(private readonly service: OpenFinanceService) {}

  /**
   * Lista las instituciones financieras disponibles para conectar.
   * @returns Arreglo de instituciones del proveedor configurado.
   */
  @Get('institutions')
  @ApiOperation({ summary: 'Listar las instituciones disponibles para conectar' })
  @ApiResponse({ status: 200, type: [InstitutionDto] })
  async institutions(): Promise<InstitutionDto[]> {
    return this.service.listInstitutions();
  }

  /**
   * Crea una conexión con una institución e inicia el flujo de consentimiento.
   * @param userId - Usuario autenticado (extraído del JWT).
   * @param dto - Datos de la conexión (institutionId).
   * @returns La conexión recién creada con su estado.
   */
  @Post('connections')
  @ApiOperation({ summary: 'Crear una conexión e iniciar el consentimiento' })
  @ApiResponse({ status: 201, type: ConnectionResponseDto })
  async createConnection(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateConnectionDto,
  ): Promise<ConnectionResponseDto> {
    const row = await this.service.createConnection(userId, dto.institutionId);
    return ConnectionResponseDto.from(row);
  }

  /**
   * Genera un token efímero para abrir el widget de consentimiento del proveedor.
   * Lo usa el cliente cuando el proveedor requiere autenticación en el banco
   * (p. ej. Belvo). El backend nunca recibe las credenciales bancarias.
   * @param userId - Usuario autenticado (extraído del JWT).
   * @returns Token de widget para inicializar el cliente.
   */
  @Post('widget-token')
  @ApiOperation({ summary: 'Generar un token para abrir el widget de consentimiento' })
  @ApiResponse({ status: 201, type: WidgetTokenDto })
  async widgetToken(@CurrentUser('sub') userId: string): Promise<WidgetTokenDto> {
    const token = await this.service.createWidgetToken(userId);
    return WidgetTokenDto.from(token);
  }

  /**
   * Finaliza una conexión iniciada por widget: persiste el identificador
   * externo (link_id) que el cliente obtuvo tras autenticar al usuario en su banco.
   * @param userId - Usuario autenticado (extraído del JWT).
   * @param dto - Institución y identificador externo de la conexión.
   * @returns La conexión persistida con su estado.
   */
  @Post('connections/finalize')
  @ApiOperation({ summary: 'Finalizar una conexión iniciada por widget (link_id)' })
  @ApiResponse({ status: 201, type: ConnectionResponseDto })
  async finalizeConnection(
    @CurrentUser('sub') userId: string,
    @Body() dto: FinalizeConnectionDto,
  ): Promise<ConnectionResponseDto> {
    const row = await this.service.finalizeConnection(
      userId,
      dto.institutionId,
      dto.externalConnectionId,
    );
    return ConnectionResponseDto.from(row);
  }

  /**
   * Lista todas las conexiones activas del usuario autenticado.
   * @param userId - Usuario autenticado (extraído del JWT).
   * @returns Arreglo de conexiones del usuario.
   */
  @Get('connections')
  @ApiOperation({ summary: 'Listar las conexiones del usuario' })
  @ApiResponse({ status: 200, type: [ConnectionResponseDto] })
  async listConnections(@CurrentUser('sub') userId: string): Promise<ConnectionResponseDto[]> {
    const rows = await this.service.listConnections(userId);
    return rows.map((r) => ConnectionResponseDto.from(r));
  }

  /**
   * Sincroniza cuentas y productos de crédito de una conexión.
   * @param userId - Usuario autenticado (extraído del JWT).
   * @param id - UUID de la conexión a sincronizar.
   * @returns Resumen de creados, actualizados y omitidos.
   */
  @Post('connections/:id/sync')
  @ApiOperation({ summary: 'Sincronizar cuentas y productos de crédito de una conexión' })
  @ApiResponse({ status: 201, type: SyncSummaryDto })
  async sync(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<SyncSummaryDto> {
    return this.service.sync(userId, id);
  }

  /**
   * Revoca una conexión. Los datos ya importados se conservan.
   * @param userId - Usuario autenticado (extraído del JWT).
   * @param id - UUID de la conexión a revocar.
   */
  @Delete('connections/:id')
  @ApiOperation({ summary: 'Revocar una conexión (conserva lo ya importado)' })
  @ApiResponse({ status: 200, description: 'Conexión revocada.' })
  async revoke(@CurrentUser('sub') userId: string, @Param('id') id: string): Promise<void> {
    return this.service.revoke(userId, id);
  }
}
