import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { groups, groupMembers, groupInvites, users } from '../../db/schema';

/** Fila de grupo tal como se almacena. */
export type GroupRow = typeof groups.$inferSelect;
/** Fila de miembro de grupo tal como se almacena. */
export type GroupMemberRow = typeof groupMembers.$inferSelect;
/** Fila de invitacion de grupo tal como se almacena. */
export type InviteRow = typeof groupInvites.$inferSelect;

/** Campos actualizables de un grupo (whitelist). */
export interface GroupUpdateFields {
  name?: string;
  archivedAt?: Date | null;
}

/**
 * Repositorio de grupos de gasto compartido. Todas las consultas estan aisladas
 * por membresia real activa del usuario.
 */
@Injectable()
export class GroupsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Crea un grupo y agrega al creador como miembro real activo.
   * Resuelve el displayName consultando users.fullName dentro de la transaccion;
   * si por alguna razon no hay fullName, usa el email como respaldo.
   * @param userId - UUID del usuario creador.
   * @param name - Nombre del grupo.
   * @param emailFallback - Email del creador, usado como respaldo si no se encuentra fullName.
   * @returns El grupo creado.
   */
  async createGroup(userId: string, name: string, emailFallback: string): Promise<GroupRow> {
    return this.db.transaction(async (tx) => {
      const [userRow] = await tx
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const displayName = userRow?.fullName?.trim() || emailFallback;

      const [group] = await tx
        .insert(groups)
        .values({ name, createdBy: userId })
        .returning();
      await tx.insert(groupMembers).values({
        groupId: group.id,
        userId,
        displayName,
        addedByUserId: userId,
      });
      return group;
    });
  }

  /**
   * Busca el miembro real activo de un grupo para control de acceso.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario.
   * @returns El miembro activo, o `undefined` si no pertenece.
   */
  async findActiveMember(groupId: string, userId: string): Promise<GroupMemberRow | undefined> {
    const [member] = await this.db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId),
          isNull(groupMembers.removedAt),
        ),
      )
      .limit(1);
    return member;
  }

  /**
   * Busca un grupo activo al que el usuario pertenece como miembro real activo.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario.
   * @returns El grupo si el usuario es miembro activo, o `undefined`.
   */
  async findGroupForMember(groupId: string, userId: string): Promise<GroupRow | undefined> {
    const [group] = await this.db
      .select({ group: groups })
      .from(groups)
      .innerJoin(
        groupMembers,
        and(
          eq(groupMembers.groupId, groups.id),
          eq(groupMembers.userId, userId),
          isNull(groupMembers.removedAt),
        ),
      )
      .where(eq(groups.id, groupId))
      .limit(1)
      .then((rows) => rows.map((r) => r.group));
    return group;
  }

  /**
   * Lista todos los grupos en los que el usuario es miembro real activo.
   * Ordena de mas reciente a mas antiguo y limita a 200 resultados.
   * @param userId - UUID del usuario.
   * @returns Lista de grupos ordenada por fecha de creacion descendente.
   */
  async findGroupsForUser(userId: string): Promise<GroupRow[]> {
    return this.db
      .select({ group: groups })
      .from(groups)
      .innerJoin(
        groupMembers,
        and(
          eq(groupMembers.groupId, groups.id),
          eq(groupMembers.userId, userId),
          isNull(groupMembers.removedAt),
        ),
      )
      .orderBy(desc(groups.createdAt))
      .limit(200)
      .then((rows) => rows.map((r) => r.group));
  }

  /**
   * Inserta un miembro fantasma (sin cuenta de usuario) en el grupo.
   * @param groupId - UUID del grupo.
   * @param addedBy - UUID del usuario real que lo agrega.
   * @param displayName - Nombre visible del fantasma dentro del grupo.
   * @returns La fila del miembro creado.
   */
  async addGhostMember(groupId: string, addedBy: string, displayName: string): Promise<GroupMemberRow> {
    const [member] = await this.db
      .insert(groupMembers)
      .values({ groupId, userId: null, displayName, addedByUserId: addedBy })
      .returning();
    return member;
  }

  /**
   * Soft-delete de un miembro del grupo (marca removedAt = now).
   * Valida que el miembro pertenezca al grupo antes de eliminarlo.
   * @param groupId - UUID del grupo.
   * @param memberId - UUID del miembro a quitar.
   * @throws NotFoundException si el miembro no existe en el grupo o ya fue removido.
   */
  async removeMember(groupId: string, memberId: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.id, memberId),
          eq(groupMembers.groupId, groupId),
          isNull(groupMembers.removedAt),
        ),
      )
      .limit(1);
    if (!existing) {
      throw new NotFoundException('Miembro no encontrado en el grupo.');
    }
    await this.db
      .update(groupMembers)
      .set({ removedAt: new Date() })
      .where(
        and(
          eq(groupMembers.id, memberId),
          eq(groupMembers.groupId, groupId),
          isNull(groupMembers.removedAt),
        ),
      );
  }

  /**
   * Lista los miembros activos (vivos) de un grupo con orden determinista.
   * El orden estable es necesario para que deriveDebts produzca resultados reproducibles.
   * @param groupId - UUID del grupo.
   * @returns Lista de miembros activos ordenada por joinedAt y luego por id.
   */
  async listMembers(groupId: string): Promise<GroupMemberRow[]> {
    return this.db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          isNull(groupMembers.removedAt),
        ),
      )
      .orderBy(asc(groupMembers.joinedAt), asc(groupMembers.id));
  }

  /**
   * Actualiza el nombre o el estado de archivo de un grupo.
   * @param groupId - UUID del grupo.
   * @param fields - Campos a actualizar.
   * @returns El grupo actualizado, o `undefined` si no existe.
   */
  async renameOrArchive(
    groupId: string,
    fields: GroupUpdateFields,
  ): Promise<GroupRow | undefined> {
    const [group] = await this.db
      .update(groups)
      .set(fields)
      .where(eq(groups.id, groupId))
      .returning();
    return group;
  }

  /**
   * Marca al usuario como removido del grupo (soft remove en la membresia).
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario.
   */
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    await this.db
      .update(groupMembers)
      .set({ removedAt: new Date() })
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId),
          isNull(groupMembers.removedAt),
        ),
      );
  }

  /**
   * Busca un grupo por su UUID.
   * @param groupId - UUID del grupo.
   * @returns El grupo, o `undefined` si no existe.
   */
  async findGroupById(groupId: string): Promise<GroupRow | undefined> {
    const [group] = await this.db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);
    return group;
  }

  /**
   * Crea una invitacion con TTL de 7 dias. Si se indica memberId, la invitacion
   * queda ligada a ese miembro fantasma para que pueda ser reclamado.
   * @param groupId - UUID del grupo.
   * @param createdBy - UUID del usuario que genera la invitacion.
   * @param code - Codigo unico generado previamente.
   * @param memberId - UUID del miembro fantasma a reclamar (opcional).
   * @returns La fila de invitacion creada.
   */
  async createInvite(
    groupId: string,
    createdBy: string,
    code: string,
    memberId?: string,
  ): Promise<InviteRow> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [invite] = await this.db
      .insert(groupInvites)
      .values({ groupId, createdBy, code, memberId: memberId ?? null, expiresAt })
      .returning();
    return invite;
  }

  /**
   * Busca una invitacion activa por su codigo.
   * @param code - Codigo de 8 caracteres de la invitacion.
   * @returns La fila de invitacion, o `undefined` si no existe.
   */
  async findInviteByCode(code: string): Promise<InviteRow | undefined> {
    const [invite] = await this.db
      .select()
      .from(groupInvites)
      .where(eq(groupInvites.code, code))
      .limit(1);
    return invite;
  }

  /**
   * Une al usuario a un grupo de forma atomica dentro de una transaccion.
   * Si el invite apunta a un fantasma (memberId presente), lo reclama asignando userId
   * solo si el fantasma sigue activo (userId IS NULL AND removed_at IS NULL).
   * Si no hay memberId, inserta un miembro real nuevo.
   * En el mismo commit de la transaccion, marca el invite como consumido.
   * @param invite - Fila de la invitacion validada previamente.
   * @param userId - UUID del usuario que se une.
   * @param displayName - Nombre visible dentro del grupo (solo se usa cuando se crea miembro nuevo).
   * @throws ConflictException si el fantasma ya fue reclamado o removido.
   */
  async joinGroupAtomically(invite: InviteRow, userId: string, displayName: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (invite.memberId) {
        // Reclama el fantasma: solo si sigue activo (user_id IS NULL y no removido).
        // No sobreescribe displayName para conservar el nombre que el grupo ya conoce.
        const claimed = await tx
          .update(groupMembers)
          .set({ userId })
          .where(
            and(
              eq(groupMembers.id, invite.memberId),
              isNull(groupMembers.userId),
              isNull(groupMembers.removedAt),
            ),
          )
          .returning({ id: groupMembers.id });
        if (claimed.length === 0) {
          throw new ConflictException('El fantasma ya fue reclamado o removido.');
        }
      } else {
        // Inserta un miembro real nuevo en el grupo.
        await tx.insert(groupMembers).values({
          groupId: invite.groupId,
          userId,
          displayName,
          addedByUserId: userId,
        });
      }

      // Marca el invite como consumido en la misma transaccion.
      await tx
        .update(groupInvites)
        .set({ consumedAt: new Date(), consumedBy: userId })
        .where(eq(groupInvites.id, invite.id));
    });
  }

  /**
   * Resuelve el displayName de un usuario desde su fullName o email como respaldo.
   * @param userId - UUID del usuario.
   * @param emailFallback - Email del usuario como respaldo si fullName esta vacio.
   * @returns El nombre visible del usuario.
   */
  async resolveDisplayName(userId: string, emailFallback: string): Promise<string> {
    const [userRow] = await this.db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return userRow?.fullName?.trim() || emailFallback;
  }
}
