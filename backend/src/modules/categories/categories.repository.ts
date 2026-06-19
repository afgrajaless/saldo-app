import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { categories } from '../../db/schema';

/** Fila de categoria tal como se almacena. */
export type CategoryRow = typeof categories.$inferSelect;
/** Valores para insertar una categoria (sin id ni timestamps). */
export type NewCategoryValues = Omit<
  typeof categories.$inferInsert,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'userId'
>;
/** Campos actualizables de una categoria (whitelist). */
export interface CategoryUpdateFields {
  name?: string;
  color?: string;
  monthlyBudget?: string | null;
}

/**
 * Repositorio de categorias de presupuesto. Todas las consultas estan aisladas
 * por user_id y excluyen las categorias con soft delete.
 */
@Injectable()
export class CategoriesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Crea una categoria del usuario.
   * @param userId - Dueno de la categoria.
   * @param values - Datos de la categoria.
   * @returns La categoria creada.
   */
  async create(userId: string, values: NewCategoryValues): Promise<CategoryRow> {
    const [category] = await this.db
      .insert(categories)
      .values({ ...values, userId })
      .returning();
    return category;
  }

  /**
   * Lista las categorias vivas del usuario.
   * @param userId - Dueno de las categorias.
   * @returns Las categorias no eliminadas.
   */
  async findAllByUser(userId: string): Promise<CategoryRow[]> {
    return this.db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), isNull(categories.deletedAt)))
      .orderBy(desc(categories.createdAt));
  }

  /**
   * Busca una categoria viva por id, garantizando que pertenezca al usuario.
   * @param id - UUID de la categoria.
   * @param userId - Dueno esperado.
   * @returns La categoria, o `undefined`.
   */
  async findByIdForUser(id: string, userId: string): Promise<CategoryRow | undefined> {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(
        and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)),
      )
      .limit(1);
    return category;
  }

  /**
   * Actualiza campos permitidos de una categoria del usuario.
   * @param id - UUID de la categoria.
   * @param userId - Dueno esperado.
   * @param fields - Campos a actualizar.
   * @returns La categoria actualizada, o `undefined`.
   */
  async update(
    id: string,
    userId: string,
    fields: CategoryUpdateFields,
  ): Promise<CategoryRow | undefined> {
    const [category] = await this.db
      .update(categories)
      .set(fields)
      .where(
        and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)),
      )
      .returning();
    return category;
  }

  /**
   * Marca una categoria como eliminada (soft delete).
   * @param id - UUID de la categoria.
   * @param userId - Dueno esperado.
   * @returns El id eliminado, o `undefined`.
   */
  async softDelete(id: string, userId: string): Promise<string | undefined> {
    const [deleted] = await this.db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)),
      )
      .returning({ id: categories.id });
    return deleted?.id;
  }
}
