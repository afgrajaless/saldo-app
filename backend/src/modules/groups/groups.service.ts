import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { GroupMemberRow, GroupRow, GroupUpdateFields, GroupsRepository } from './groups.repository';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';

/**
 * Servicio de grupos de gasto compartido. Todo acceso a un grupo se valida
 * previamente con `assertActiveMember` para garantizar aislamiento.
 */
@Injectable()
export class GroupsService {
  constructor(private readonly groupsRepository: GroupsRepository) {}

  /**
   * Verifica que el usuario sea miembro real activo del grupo.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado.
   * @returns El registro de membresia si es valido.
   * @throws ForbiddenException si el usuario no pertenece al grupo.
   */
  async assertActiveMember(groupId: string, userId: string): Promise<GroupMemberRow> {
    const member = await this.groupsRepository.findActiveMember(groupId, userId);
    if (!member) {
      throw new ForbiddenException('No perteneces a este grupo.');
    }
    return member;
  }

  /**
   * Crea un grupo nuevo y agrega al usuario como miembro real owner.
   * El displayName del creador se resuelve desde users.fullName en el repositorio;
   * el email se pasa como respaldo en caso de que fullName no este disponible.
   * @param userId - UUID del usuario autenticado.
   * @param dto - Datos del grupo.
   * @param emailFallback - Email del usuario, usado como respaldo si fullName esta vacio.
   * @returns El grupo creado.
   */
  async create(userId: string, dto: CreateGroupDto, emailFallback: string): Promise<GroupResponseDto> {
    const group = await this.groupsRepository.createGroup(userId, dto.name.trim(), emailFallback);
    return this.toResponse(group);
  }

  /**
   * Lista todos los grupos en los que el usuario es miembro activo.
   * @param userId - UUID del usuario autenticado.
   * @returns Lista de grupos.
   */
  async findAll(userId: string): Promise<GroupResponseDto[]> {
    const rows = await this.groupsRepository.findGroupsForUser(userId);
    return rows.map((g) => this.toResponse(g));
  }

  /**
   * Devuelve un grupo especifico, validando que el usuario sea miembro activo.
   * La validacion de membresia se realiza en el JOIN de findGroupForMember,
   * por lo que no se necesita un chequeo previo con findActiveMember.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado.
   * @returns El grupo.
   * @throws NotFoundException si el grupo no existe o el usuario no es miembro activo.
   */
  async findOne(groupId: string, userId: string): Promise<GroupResponseDto> {
    const group = await this.groupsRepository.findGroupForMember(groupId, userId);
    if (!group) {
      throw new NotFoundException('Grupo no encontrado o no eres miembro.');
    }
    return this.toResponse(group);
  }

  /**
   * Renombra o archiva un grupo. Solo miembros activos pueden operar.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado.
   * @param dto - Campos a actualizar.
   * @returns El grupo actualizado.
   * @throws ForbiddenException si no es miembro.
   * @throws NotFoundException si el grupo no existe.
   */
  async update(groupId: string, userId: string, dto: UpdateGroupDto): Promise<GroupResponseDto> {
    await this.assertActiveMember(groupId, userId);
    const fields: GroupUpdateFields = {};
    if (dto.name !== undefined) {
      fields.name = dto.name.trim();
    }
    if (dto.archived !== undefined) {
      fields.archivedAt = dto.archived ? new Date() : null;
    }
    const updated = await this.groupsRepository.renameOrArchive(groupId, fields);
    if (!updated) {
      throw new NotFoundException('Grupo no encontrado.');
    }
    return this.toResponse(updated);
  }

  /**
   * El usuario sale del grupo (soft remove de la membresia).
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado.
   * @throws ForbiddenException si no es miembro.
   */
  async leave(groupId: string, userId: string): Promise<void> {
    await this.assertActiveMember(groupId, userId);
    await this.groupsRepository.leaveGroup(groupId, userId);
  }

  /**
   * Mapea una fila de grupo a su DTO de respuesta.
   * @param group - Fila de grupo.
   * @returns El DTO de respuesta.
   */
  private toResponse(group: GroupRow): GroupResponseDto {
    return {
      id: group.id,
      name: group.name,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      archived: group.archivedAt !== null,
      archivedAt: group.archivedAt,
    };
  }
}
