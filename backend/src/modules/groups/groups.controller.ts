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
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { BalanceService } from './balance.service';
import { BalanceResponseDto } from './dto/balance-response.dto';

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
  @ApiOperation({ summary: 'Generar un codigo de invitacion para el grupo' })
  @ApiParam({ name: 'id', description: 'UUID del grupo', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Invitacion creada.', type: InviteResponseDto })
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
  @ApiOperation({ summary: 'Unirse a un grupo usando un codigo de invitacion' })
  @ApiResponse({ status: 201, description: 'Unido al grupo exitosamente.', type: GroupResponseDto })
  @ApiResponse({ status: 404, description: 'Codigo de invitacion no encontrado.' })
  @ApiResponse({ status: 409, description: 'Codigo vencido, ya consumido, o ya eres miembro del grupo.' })
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
  @ApiResponse({ status: 400, description: 'Datos invalidos o reparto incorrecto.' })
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
  @ApiResponse({ status: 400, description: 'Datos invalidos o reparto incorrecto.' })
  @ApiResponse({ status: 403, description: 'No eres miembro del grupo.' })
  @ApiResponse({ status: 404, description: 'Gasto no encontrado.' })
  updateExpense(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() dto: Partial<CreateExpenseDto>,
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
}
