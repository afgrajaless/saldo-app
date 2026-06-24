import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GroupMemberRow,
  GroupRow,
  GroupUpdateFields,
  GroupsRepository,
  InviteRow,
} from './groups.repository';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { generateInviteCode } from './invite-code';

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
   * Agrega un miembro fantasma al grupo. Solo miembros reales activos pueden agregar fantasmas.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado que realiza la accion.
   * @param dto - Datos del fantasma (displayName).
   * @returns El miembro creado como DTO de respuesta.
   * @throws ForbiddenException si el usuario no es miembro activo del grupo.
   */
  async addMember(groupId: string, userId: string, dto: AddMemberDto): Promise<MemberResponseDto> {
    await this.assertActiveMember(groupId, userId);
    const member = await this.groupsRepository.addGhostMember(groupId, userId, dto.displayName);
    return this.toMemberResponse(member);
  }

  /**
   * Quita un miembro del grupo (soft delete). Solo miembros reales activos pueden operar.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado que realiza la accion.
   * @param memberId - UUID del miembro a quitar.
   * @throws ForbiddenException si el usuario no es miembro activo del grupo.
   * @throws NotFoundException si el miembro no existe en el grupo.
   */
  async removeMember(groupId: string, userId: string, memberId: string): Promise<void> {
    await this.assertActiveMember(groupId, userId);
    await this.groupsRepository.removeMember(groupId, memberId);
  }

  /**
   * Lista los miembros activos del grupo. Solo miembros reales activos pueden listar.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado.
   * @returns Lista de miembros activos (reales y fantasmas).
   * @throws ForbiddenException si el usuario no es miembro activo del grupo.
   */
  async listMembers(groupId: string, userId: string): Promise<MemberResponseDto[]> {
    await this.assertActiveMember(groupId, userId);
    const rows = await this.groupsRepository.listMembers(groupId);
    return rows.map((m) => this.toMemberResponse(m));
  }

  /**
   * Genera un codigo de invitacion para un grupo. Reintenta si el codigo ya existe.
   * Si se indica memberId, valida que el miembro sea un fantasma activo del grupo.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado que genera la invitacion.
   * @param dto - DTO con el memberId opcional a ligar.
   * @returns La invitacion creada con su codigo.
   * @throws ForbiddenException si el usuario no es miembro activo del grupo.
   * @throws NotFoundException si memberId no corresponde a un fantasma activo del grupo.
   */
  async createInvite(groupId: string, userId: string, dto: CreateInviteDto): Promise<InviteResponseDto> {
    await this.assertActiveMember(groupId, userId);

    // Si se especifica un memberId, valida que sea un fantasma activo de este grupo.
    // Los fantasmas no tienen userId, por lo que findActiveMember no los encuentra.
    // Usamos listMembers y filtramos manualmente.
    if (dto.memberId) {
      const members = await this.groupsRepository.listMembers(groupId);
      const ghost = members.find(
        (m) => m.id === dto.memberId && m.userId === null,
      );
      if (!ghost) {
        throw new NotFoundException(
          'El miembro indicado no existe en el grupo o no es un fantasma activo.',
        );
      }
    }

    // Reintenta si hay colision de codigo (improbable pero posible).
    let invite: InviteRow | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateInviteCode();
      try {
        invite = await this.groupsRepository.createInvite(groupId, userId, code, dto.memberId);
        break;
      } catch (err: unknown) {
        // Colision de unique constraint en el codigo: reintentar.
        const isUniqueViolation =
          err instanceof Error &&
          'code' in err &&
          (err as { code: string }).code === '23505';
        if (!isUniqueViolation) throw err;
      }
    }

    if (!invite) {
      throw new ConflictException('No se pudo generar un codigo unico. Intenta de nuevo.');
    }

    return this.toInviteResponse(invite);
  }

  /**
   * Une al usuario a un grupo usando un codigo de invitacion de forma atomica.
   * Si el invite apunta a un fantasma activo, lo reclama (asigna userId).
   * Si no, crea un miembro real nuevo.
   * Toda la logica de membresia y consumo del invite ocurre en una sola transaccion.
   * Rechaza con 409 si el invite es invalido (vencido, consumido) o si el
   * usuario ya es miembro real del grupo.
   * @param userId - UUID del usuario autenticado que quiere unirse.
   * @param code - Codigo de invitacion de 8 caracteres.
   * @param emailFallback - Email del usuario, usado como respaldo para el displayName.
   * @returns El grupo al que se unio.
   * @throws ConflictException si el invite es invalido, el usuario ya es miembro, o el fantasma ya fue reclamado.
   * @throws NotFoundException si el invite no existe o el grupo no existe.
   */
  async joinByCode(userId: string, code: string, emailFallback?: string): Promise<GroupResponseDto> {
    const invite = await this.groupsRepository.findInviteByCode(code);
    if (!invite) {
      throw new NotFoundException('Codigo de invitacion no encontrado.');
    }
    if (invite.consumedAt !== null) {
      throw new ConflictException('Este codigo de invitacion ya fue utilizado.');
    }
    if (invite.expiresAt < new Date()) {
      throw new ConflictException('El codigo de invitacion ha vencido.');
    }

    // Valida que el usuario no sea ya miembro real activo del grupo.
    const existing = await this.groupsRepository.findActiveMember(invite.groupId, userId);
    if (existing) {
      throw new ConflictException('Ya eres miembro activo de este grupo.');
    }

    // Resuelve el displayName antes de la transaccion (solo se usa si no hay fantasma).
    const displayName = emailFallback
      ? await this.groupsRepository.resolveDisplayName(userId, emailFallback)
      : userId;

    // Ejecuta reclamacion/insercion + consumo del invite en una sola transaccion atomica.
    await this.groupsRepository.joinGroupAtomically(invite, userId, displayName);

    const group = await this.groupsRepository.findGroupById(invite.groupId);
    if (!group) {
      throw new NotFoundException('El grupo de la invitacion no existe.');
    }
    return this.toResponse(group);
  }

  /**
   * Mapea una fila de invitacion a su DTO de respuesta.
   * @param invite - Fila de invitacion.
   * @returns El DTO de respuesta.
   */
  private toInviteResponse(invite: InviteRow): InviteResponseDto {
    return {
      id: invite.id,
      groupId: invite.groupId,
      code: invite.code,
      memberId: invite.memberId,
      createdBy: invite.createdBy,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };
  }

  /**
   * Mapea una fila de miembro a su DTO de respuesta.
   * @param member - Fila del miembro.
   * @returns El DTO de respuesta.
   */
  private toMemberResponse(member: GroupMemberRow): MemberResponseDto {
    return {
      id: member.id,
      groupId: member.groupId,
      userId: member.userId,
      displayName: member.displayName,
      isGhost: member.userId === null,
      joinedAt: member.joinedAt,
    };
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
