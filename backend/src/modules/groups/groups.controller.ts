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

/**
 * CRUD de grupos de gasto compartido. Todas las rutas exigen autenticacion.
 * El acceso a un grupo especifico requiere membresia real activa.
 */
@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

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
}
