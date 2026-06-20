import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { categories, transactions } from '../../db/schema';

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
   * Busca una categoria viva del usuario por nombre (sin distinguir mayusculas)
   * y tipo. Sirve para evitar duplicados.
   * @param userId - Dueno de la categoria.
   * @param name - Nombre a buscar.
   * @param type - Tipo de la categoria (income o expense).
   * @returns La categoria si existe, o `undefined`.
   */
  async findByNameAndType(
    userId: string,
    name: string,
    type: CategoryRow['type'],
  ): Promise<CategoryRow | undefined> {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.type, type),
          sql`lower(${categories.name}) = ${name.toLowerCase()}`,
          isNull(categories.deletedAt),
        ),
      )
      .limit(1);
    return category;
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
   * Cuenta las transacciones del usuario agrupadas por categoria.
   * @param userId - Dueno de las transacciones.
   * @returns Lista de { categoryId, count }.
   */
  async countTransactionsByUser(
    userId: string,
  ): Promise<{ categoryId: string; count: number }[]> {
    return this.db
      .select({
        categoryId: transactions.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .groupBy(transactions.categoryId);
  }

  /**
   * Indica si una categoria tiene transacciones asociadas.
   * @param categoryId - UUID de la categoria.
   * @returns true si tiene al menos una transaccion.
   */
  async hasTransactions(categoryId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.categoryId, categoryId))
      .limit(1);
    return row !== undefined;
  }

  /**
   * Reasigna las transacciones de una categoria a otra, prefijando el nombre
   * original de la categoria en la descripcion del movimiento.
   * @param userId - Dueno de las transacciones.
   * @param fromCategoryId - Categoria origen.
   * @param toCategoryId - Categoria destino.
   * @param originalName - Nombre a heredar en la descripcion.
   */
  async reassignTransactions(
    userId: string,
    fromCategoryId: string,
    toCategoryId: string,
    originalName: string,
  ): Promise<void> {
    await this.db
      .update(transactions)
      .set({
        categoryId: toCategoryId,
        description: sql`${originalName} || case
          when ${transactions.description} is null or ${transactions.description} = '' then ''
          else ' · ' || ${transactions.description} end`,
      })
      .where(
        and(eq(transactions.userId, userId), eq(transactions.categoryId, fromCategoryId)),
      );
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
