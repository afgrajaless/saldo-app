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
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { DisputeShareDto } from './dto/dispute-share.dto';
import { BalanceService } from './balance.service';
import { BalanceResponseDto } from './dto/balance-response.dto';
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { SettlementResponseDto } from './dto/settlement-response.dto';
import { MyDebtsService } from './my-debts.service';
import { MyGroupDebtDto } from './dto/my-debts-response.dto';

/**
 * CRUD de grupos de gasto compartido. Todas las rutas exigen autenticacion.
 * El acceso a un grupo especifico requiere membresia real activa.
 */
@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly expensesService: ExpensesService,
    private readonly balanceService: BalanceService,
    private readonly settlementsService: SettlementsService,
    private readonly myDebtsService: MyDebtsService,
  ) {}

  /**
   * Crea un grupo nuevo y agrega al usuario como primer miembro.
   * El displayName del creador se resuelve desde users.fullName en el repositorio.
   * @param userId - UUID del usuario autenticado.
   * @param email - Email del usuario, usado como respaldo si fullName no esta disponible.
   * @param dto - Datos del grupo.
   * @returns El grupo creado.
   */
  @Post()
  @ApiOperation({ summary: 'Crear un grupo de gasto compartido' })
  @ApiResponse({ status: 201, description: 'Grupo creado.', type: GroupResponseDto })
  create(
    @CurrentUser('sub') userId: string,
    @CurrentUser('email') email: string,
    @Body() dto: CreateGroupDto,
  ): Promise<GroupResponseDto> {
    return this.groupsService.create(userId, dto, email);
  }

  /**
   * Lista los grupos en los que el usuario es miembro activo.
   * @param userId - UUID del usuario autenticado.
   * @returns Lista de grupos.
   */
  @Get()
  @ApiOperation({ summary: 'Listar los grupos del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de grupos.', type: [GroupResponseDto] })
  findAll(@CurrentUser('sub') userId: string): Promise<GroupResponseDto[]> {
    return this.groupsService.findAll(userId);
  }

  /**
   * Devuelve el agregado de todo lo que el usuario debe en sus grupos activos.
   * Para cada grupo activo, calcula las deudas directas y filtra las del usuario.
   * El resultado es una lista plana ordenada por monto adeudado de mayor a menor.
   * NOTA: esta ruta DEBE declararse antes de GET :id para evitar que 'me' sea tratado como UUID.
   * @param userId - UUID del usuario autenticado.
   * @returns Lista de deudas del usuario en todos sus grupos.
   */
  @Get('me/debts')
  @ApiOperation({ summary: 'Consultar todo lo que el usuario debe en sus grupos activos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de deudas del usuario en todos sus grupos, ordenada por monto desc.',
    type: [MyGroupDebtDto],
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  getMyGroupDebts(@CurrentUser('sub') userId: string): Promise<MyGroupDebtDto[]> {
    return this.myDebtsService.getMyGroupDebts(userId);
  }

  /**
   * Obtiene un grupo especifico. El usuario debe ser miembro activo.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @returns El grupo.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un grupo por ID' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Grupo encontrado.', type: GroupResponseDto })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado.' })
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GroupResponseDto> {
    return this.groupsService.findOne(id, userId);
  }

  /**
   * Renombra o archiva un grupo. Solo miembros activos pueden operar.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @param dto - Campos a actualizar.
   * @returns El grupo actualizado.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Renombrar o archivar un grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Grupo actualizado.', type: GroupResponseDto })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado.' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupDto,
  ): Promise<GroupResponseDto> {
    return this.groupsService.update(id, userId, dto);
  }

  /**
   * El usuario sale del grupo (soft remove de la membresia).
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   */
  @Delete(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Salir de un grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Saliste del grupo.' })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  leave(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.groupsService.leave(id, userId);
  }

  /**
   * Lista los miembros activos del grupo. Solo miembros reales activos pueden listar.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @returns Lista de miembros activos (reales y fantasmas).
   */
  @Get(':id/members')
  @ApiOperation({ summary: 'Listar los miembros activos de un grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de miembros.', type: [MemberResponseDto] })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  listMembers(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MemberResponseDto[]> {
    return this.groupsService.listMembers(id, userId);
  }

  /**
   * Agrega un miembro fantasma al grupo. Solo miembros reales activos pueden operar.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @param dto - Datos del fantasma.
   * @returns El miembro creado.
   */
  @Post(':id/members')
  @ApiOperation({ summary: 'Agregar un miembro fantasma al grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Miembro fantasma agregado.', type: MemberResponseDto })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos (displayName vacío o muy largo).' })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  addMember(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ): Promise<MemberResponseDto> {
    return this.groupsService.addMember(id, userId, dto);
  }

  /**
   * Quita un miembro del grupo (soft delete). Solo miembros reales activos pueden operar.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @param memberId - UUID del miembro a quitar.
   */
  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar un miembro del grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiParam({ name: 'memberId', description: 'UUID del miembro a quitar', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Miembro quitado del grupo.' })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  @ApiResponse({ status: 404, description: 'Miembro no encontrado en el grupo.' })
  removeMember(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<void> {
    return this.groupsService.removeMember(id, userId, memberId);
  }

  /**
   * Genera un codigo de invitacion para un grupo. Solo miembros reales activos pueden generar.
   * Si se incluye memberId, el codigo queda ligado a ese fantasma para reclamarlo.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @param dto - DTO con memberId opcional.
   * @returns La invitacion generada con su codigo.
   */
  @Post(':id/invites')
  @ApiOperation({ summary: 'Generar un código de invitación para el grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Invitación creada.', type: InviteResponseDto })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  @ApiResponse({ status: 404, description: 'Miembro fantasma no encontrado en el grupo.' })
  @ApiResponse({ status: 409, description: 'No se pudo generar un código único, reintenta.' })
  createInvite(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    return this.groupsService.createInvite(id, userId, dto);
  }

  /**
   * El usuario se une a un grupo usando un codigo de invitacion.
   * Si el codigo esta ligado a un fantasma, lo reclama; si no, crea un miembro real nuevo.
   * @param userId - UUID del usuario autenticado.
   * @param email - Email del usuario, usado como respaldo para el displayName.
   * @param dto - DTO con el codigo de invitacion.
   * @returns El grupo al que se unio el usuario.
   */
  @Post('join')
  @ApiOperation({ summary: 'Unirse a un grupo usando un código de invitación' })
  @ApiResponse({ status: 201, description: 'Unido al grupo exitosamente.', type: GroupResponseDto })
  @ApiResponse({ status: 404, description: 'Código de invitación no encontrado.' })
  @ApiResponse({ status: 409, description: 'Código vencido, ya consumido, o ya eres miembro del grupo.' })
  joinGroup(
    @CurrentUser('sub') userId: string,
    @CurrentUser('email') email: string,
    @Body() dto: JoinGroupDto,
  ): Promise<GroupResponseDto> {
    return this.groupsService.joinByCode(userId, dto.code, email);
  }

  // ────────────────────────────── Saldo del grupo ──────────────────────────────

  /**
   * Calcula el saldo neto de cada miembro y las deudas pairwise del grupo.
   * Solo miembros reales activos pueden consultar el saldo.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @returns DTO con netos por miembro y lista de deudas.
   */
  @Get(':id/balance')
  @ApiOperation({ summary: 'Consultar el saldo del grupo: netos por miembro y deudas pairwise' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Saldo calculado correctamente.', type: BalanceResponseDto })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  getBalance(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BalanceResponseDto> {
    return this.balanceService.getBalance(id, userId);
  }

  // ────────────────────────────── Gastos compartidos ──────────────────────────

  /**
   * Registra un gasto compartido en el grupo. Calcula las partes segun el metodo
   * de reparto indicado (igual o exacto). Solo miembros activos pueden registrar gastos.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @param dto - Datos del gasto a crear.
   * @returns El gasto creado con sus partes.
   */
  @Post(':id/expenses')
  @ApiOperation({ summary: 'Registrar un gasto compartido en el grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Gasto registrado.', type: ExpenseResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos o reparto incorrecto.' })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  createExpense(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.createExpense(id, userId, dto);
  }

  /**
   * Lista los gastos activos de un grupo. Solo miembros activos pueden listar.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @returns Lista de gastos activos del grupo con sus partes.
   */
  @Get(':id/expenses')
  @ApiOperation({ summary: 'Listar los gastos compartidos del grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de gastos.', type: [ExpenseResponseDto] })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  listExpenses(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExpenseResponseDto[]> {
    return this.expensesService.listExpenses(id, userId);
  }

  /**
   * Actualiza los campos editables de un gasto compartido.
   * Si se cambia el monto o el metodo de reparto, las partes se recalculan.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @param expenseId - UUID del gasto.
   * @param dto - Campos a actualizar.
   * @returns El gasto actualizado con sus partes.
   */
  @Patch(':id/expenses/:expenseId')
  @ApiOperation({ summary: 'Editar un gasto compartido del grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiParam({ name: 'expenseId', description: 'UUID del gasto', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Gasto actualizado.', type: ExpenseResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos o reparto incorrecto.' })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  @ApiResponse({ status: 404, description: 'Gasto no encontrado.' })
  updateExpense(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.updateExpense(id, userId, expenseId, dto);
  }

  /**
   * Elimina un gasto compartido (soft delete). Solo miembros activos pueden eliminar.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @param expenseId - UUID del gasto a eliminar.
   */
  @Delete(':id/expenses/:expenseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un gasto compartido del grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiParam({ name: 'expenseId', description: 'UUID del gasto', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Gasto eliminado.' })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  @ApiResponse({ status: 404, description: 'Gasto no encontrado.' })
  deleteExpense(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ): Promise<void> {
    return this.expensesService.softDeleteExpense(id, userId, expenseId);
  }

  /**
   * Confirma la parte propia del usuario autenticado en un gasto compartido.
   * Solo puede confirmar un participante real; el pagador no puede confirmarse a si mismo.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @param expenseId - UUID del gasto.
   */
  @Post(':id/expenses/:expenseId/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirmar la parte propia del usuario en un gasto compartido' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiParam({ name: 'expenseId', description: 'UUID del gasto', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Parte confirmada correctamente.' })
  @ApiResponse({ status: 400, description: 'El usuario es el pagador del gasto o solicitud inválida.' })
  @ApiResponse({ status: 403, description: 'No eres miembro activo del grupo.' })
  @ApiResponse({ status: 404, description: 'Gasto no encontrado o no participas en él.' })
  confirmShare(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ): Promise<void> {
    return this.expensesService.confirmShare(id, userId, expenseId);
  }

  /**
   * Refuta la parte propia del usuario autenticado en un gasto compartido.
   * Permite adjuntar una nota opcional que explique el motivo de la disputa.
   * El pagador no puede refutar su propio pago.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @param expenseId - UUID del gasto.
   * @param dto - DTO con nota opcional de disputa.
   */
  @Post(':id/expenses/:expenseId/dispute')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Refutar la parte propia del usuario en un gasto compartido' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiParam({ name: 'expenseId', description: 'UUID del gasto', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Parte refutada correctamente.' })
  @ApiResponse({ status: 400, description: 'El usuario es el pagador del gasto o solicitud inválida.' })
  @ApiResponse({ status: 403, description: 'No eres miembro activo del grupo.' })
  @ApiResponse({ status: 404, description: 'Gasto no encontrado o no participas en él.' })
  disputeShare(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() dto: DisputeShareDto,
  ): Promise<void> {
    return this.expensesService.disputeShare(id, userId, expenseId, dto.note);
  }

  // ──────────────────────────── Liquidaciones de deuda ─────────────────────────

  /**
   * Registra la liquidacion de una deuda entre dos miembros del grupo.
   * Si se indica recordPersonal, crea ademas un movimiento en las finanzas personales
   * del usuario (egreso si es el pagador, ingreso si es el receptor).
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @param dto - Datos de la liquidacion.
   * @returns La liquidacion creada.
   */
  @Post(':id/settlements')
  @ApiOperation({ summary: 'Registrar la liquidación de una deuda entre miembros del grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Liquidación registrada.', type: SettlementResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos o miembros iguales.' })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  @ApiResponse({ status: 404, description: 'Miembro, cuenta o categoría no encontrados.' })
  createSettlement(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSettlementDto,
  ): Promise<SettlementResponseDto> {
    return this.settlementsService.createSettlement(id, userId, dto);
  }

  /**
   * Lista las liquidaciones registradas en el grupo.
   * Solo miembros activos pueden consultar.
   * @param userId - UUID del usuario autenticado.
   * @param id - UUID del grupo.
   * @returns Lista de liquidaciones del grupo.
   */
  @Get(':id/settlements')
  @ApiOperation({ summary: 'Listar las liquidaciones de deuda del grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de liquidaciones.', type: [SettlementResponseDto] })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  listSettlements(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SettlementResponseDto[]> {
    return this.settlementsService.listSettlements(id, userId);
  }
}
