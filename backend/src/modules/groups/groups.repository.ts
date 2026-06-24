import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { groups, groupMembers } from '../../db/schema';

/** Fila de grupo tal como se almacena. */
export type GroupRow = typeof groups.$inferSelect;
/** Fila de miembro de grupo tal como se almacena. */
export type GroupMemberRow = typeof groupMembers.$inferSelect;

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
   * @param userId - UUID del usuario creador.
   * @param name - Nombre del grupo.
   * @param displayName - Nombre visible del creador dentro del grupo.
   * @returns El grupo creado.
   */
  async createGroup(userId: string, name: string, displayName: string): Promise<GroupRow> {
    return this.db.transaction(async (tx) => {
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
   * @param userId - UUID del usuario.
   * @returns Lista de grupos.
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
      .then((rows) => rows.map((r) => r.group));
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
}
