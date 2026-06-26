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
  Put,
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
import { AccountsService } from './accounts.service';
import { AccountResponseDto } from './dto/account-response.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { AccountProjectionDto, NetWorthPointDto } from './dto/projection.dto';
import { CreateSnapshotDto, SnapshotResponseDto } from './dto/snapshot.dto';
import { SetYieldDto } from './dto/set-yield.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

/** CRUD de cuentas. Todas las rutas exigen autenticacion. */
@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /**
   * Crea una cuenta.
   * @param userId - Usuario autenticado.
   * @param dto - Datos de la cuenta.
   * @returns La cuenta creada.
   */
  @Post()
  @ApiOperation({ summary: 'Crear una cuenta' })
  @ApiResponse({ status: 201, description: 'Cuenta creada.', type: AccountResponseDto })
  @ApiResponse({ status: 409, description: 'Ya existe una cuenta con ese nombre.' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.create(userId, dto);
  }

  /**
   * Lista las cuentas del usuario.
   * @param userId - Usuario autenticado.
   * @returns Las cuentas.
   */
  @Get()
  @ApiOperation({ summary: 'Listar las cuentas del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de cuentas.', type: [AccountResponseDto] })
  findAll(@CurrentUser('sub') userId: string): Promise<AccountResponseDto[]> {
    return this.accountsService.findAll(userId);
  }

  /**
   * Devuelve la serie de patrimonio (suma de snapshots por fecha).
   * @param userId - Usuario autenticado.
   * @returns Los puntos de patrimonio ordenados por fecha.
   */
  @Get('net-worth')
  @ApiOperation({ summary: 'Serie de patrimonio total por fecha (para gráfico)' })
  @ApiResponse({ status: 200, description: 'Puntos de patrimonio.', type: [NetWorthPointDto] })
  netWorth(@CurrentUser('sub') userId: string): Promise<NetWorthPointDto[]> {
    return this.accountsService.netWorthSeries(userId);
  }

  /**
   * Configura el rendimiento de una cuenta (remunerada o CDT).
   * @param userId - Usuario autenticado.
   * @param id - UUID de la cuenta.
   * @param dto - Configuracion del rendimiento.
   * @returns La cuenta actualizada.
   */
  @Put(':id/yield')
  @ApiOperation({ summary: 'Configurar el rendimiento de una cuenta (remunerada o CDT)' })
  @ApiParam({ name: 'id', description: 'UUID de la cuenta', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Rendimiento configurado.', type: AccountResponseDto })
  setYield(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetYieldDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.setYield(userId, id, dto);
  }

  /**
   * Registra el saldo real de una cuenta en una fecha.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la cuenta.
   * @param dto - Saldo y fecha.
   * @returns El snapshot guardado.
   */
  @Post(':id/snapshots')
  @ApiOperation({ summary: 'Registrar el saldo real de una cuenta en una fecha' })
  @ApiParam({ name: 'id', description: 'UUID de la cuenta', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Snapshot guardado.', type: SnapshotResponseDto })
  addSnapshot(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSnapshotDto,
  ): Promise<SnapshotResponseDto> {
    return this.accountsService.addSnapshot(userId, id, dto);
  }

  /**
   * Lista los snapshots de saldo de una cuenta.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la cuenta.
   * @returns Los snapshots ordenados por fecha.
   */
  @Get(':id/snapshots')
  @ApiOperation({ summary: 'Listar los snapshots de saldo de una cuenta' })
  @ApiParam({ name: 'id', description: 'UUID de la cuenta', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Snapshots.', type: [SnapshotResponseDto] })
  listSnapshots(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SnapshotResponseDto[]> {
    return this.accountsService.listSnapshots(userId, id);
  }

  /**
   * Elimina un snapshot de saldo.
   * @param userId - Usuario autenticado.
   * @param snapshotId - UUID del snapshot.
   */
  @Delete('snapshots/:snapshotId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un snapshot de saldo' })
  @ApiParam({ name: 'snapshotId', description: 'UUID del snapshot', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Snapshot eliminado.' })
  removeSnapshot(
    @CurrentUser('sub') userId: string,
    @Param('snapshotId', ParseUUIDPipe) snapshotId: string,
  ): Promise<void> {
    return this.accountsService.removeSnapshot(userId, snapshotId);
  }

  /**
   * Proyecta el crecimiento de una cuenta con rendimiento (curva para grafico).
   * @param userId - Usuario autenticado.
   * @param id - UUID de la cuenta.
   * @param months - Horizonte en meses (solo cuenta remunerada).
   * @returns La proyeccion.
   */
  @Get(':id/projection')
  @ApiOperation({ summary: 'Proyección de crecimiento de una cuenta (curva para gráfico)' })
  @ApiParam({ name: 'id', description: 'UUID de la cuenta', format: 'uuid' })
  @ApiQuery({ name: 'months', required: false, description: 'Horizonte en meses (def. 12).' })
  @ApiResponse({ status: 200, description: 'Proyección.', type: AccountProjectionDto })
  projection(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('months') months?: string,
  ): Promise<AccountProjectionDto> {
    const parsed = months ? Number(months) : undefined;
    const horizon = parsed && Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
    return this.accountsService.projection(userId, id, horizon);
  }

  /**
   * Actualiza una cuenta.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la cuenta.
   * @param dto - Campos a actualizar.
   * @returns La cuenta actualizada.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una cuenta' })
  @ApiParam({ name: 'id', description: 'UUID de la cuenta', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Cuenta actualizada.', type: AccountResponseDto })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada.' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.update(userId, id, dto);
  }

  /**
   * Elimina (soft delete) una cuenta.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la cuenta.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una cuenta (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID de la cuenta', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Cuenta eliminada.' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada.' })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.accountsService.remove(userId, id);
  }
}
