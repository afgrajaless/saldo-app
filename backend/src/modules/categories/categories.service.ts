import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRow, CategoriesRepository } from './categories.repository';

/** Nombre de la categoria contenedora a la que se mueven los movimientos huerfanos. */
const OTHERS_CATEGORY_NAME = 'Otros';
/** Nombre de la subcategoria que absorbe los movimientos directos de un padre. */
const GENERAL_CHILD_NAME = 'General';

/** Servicio de categorias de presupuesto (CRUD aislado por usuario). */
@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  /**
   * Crea una categoria (de primer nivel o subcategoria de otra).
   * @param userId - Dueno de la categoria.
   * @param dto - Datos de la categoria (incluye parentId opcional).
   * @returns La categoria creada.
   */
  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const name = dto.name.trim();
    const parentId = dto.parentId ?? null;
    if (parentId) {
      const parent = await this.resolveParent(userId, parentId, dto.type);
      // Al colgarle su primer hijo, los movimientos directos del padre pasan a
      // una subcategoria "General" (regla hoja-only: el padre no recibe gasto).
      await this.absorbDirectTransactions(userId, parent);
    }
    await this.ensureNameAvailable(userId, name, dto.type, parentId);
    const category = await this.categoriesRepository.create(userId, {
      name,
      type: dto.type,
      parentId,
      color: dto.color ?? '#0B5D3B',
      monthlyBudget: dto.monthlyBudget?.toFixed(2) ?? null,
    });
    return this.toResponse(category);
  }

  /**
   * Valida y devuelve la categoria padre indicada.
   * @param userId - Dueno de la categoria.
   * @param parentId - UUID de la categoria padre propuesta.
   * @param type - Tipo que debe compartir la subcategoria.
   * @returns La categoria padre valida.
   * @throws BadRequestException si no existe, es de otro tipo o ya es subcategoria.
   */
  private async resolveParent(
    userId: string,
    parentId: string,
    type: CategoryRow['type'],
  ): Promise<CategoryRow> {
    const parent = await this.categoriesRepository.findByIdForUser(parentId, userId);
    if (!parent) {
      throw new BadRequestException('La categoría padre no existe o no es del usuario.');
    }
    if (parent.parentId !== null) {
      throw new BadRequestException('Solo se permite un nivel de subcategorías.');
    }
    if (parent.type !== type) {
      throw new BadRequestException(
        'La subcategoría debe ser del mismo tipo que su categoría padre.',
      );
    }
    return parent;
  }

  /**
   * Si la categoria padre aun no tiene subcategorias pero si movimientos directos,
   * los traslada a una subcategoria "General" para conservar la invariante de que
   * el total del padre es la suma de sus hijos.
   * @param userId - Dueno de las categorias.
   * @param parent - Categoria que pasara a ser padre.
   */
  private async absorbDirectTransactions(userId: string, parent: CategoryRow): Promise<void> {
    const alreadyParent = await this.categoriesRepository.hasLiveChildren(parent.id);
    if (alreadyParent) return;
    if (!(await this.categoriesRepository.hasTransactions(parent.id))) return;
    const general = await this.getOrCreateChild(userId, parent, GENERAL_CHILD_NAME);
    await this.categoriesRepository.moveTransactions(userId, parent.id, general.id);
  }

  /**
   * Obtiene una subcategoria por nombre bajo un padre, creandola si no existe.
   * @param userId - Dueno de la categoria.
   * @param parent - Categoria padre.
   * @param name - Nombre de la subcategoria.
   * @returns La subcategoria existente o recien creada.
   */
  private async getOrCreateChild(
    userId: string,
    parent: CategoryRow,
    name: string,
  ): Promise<CategoryRow> {
    const existing = await this.categoriesRepository.findByNameInScope(
      userId,
      name,
      parent.type,
      parent.id,
    );
    if (existing) return existing;
    return this.categoriesRepository.create(userId, {
      name,
      type: parent.type,
      parentId: parent.id,
      color: parent.color,
      monthlyBudget: null,
    });
  }

  /**
   * Verifica que no exista ya otra categoria del mismo nombre, tipo y padre.
   * @param userId - Dueno de las categorias.
   * @param name - Nombre propuesto.
   * @param type - Tipo de la categoria.
   * @param parentId - Padre bajo el que vive (null = primer nivel).
   * @param ignoreId - Id a ignorar (la propia categoria al editar).
   * @throws ConflictException si el nombre ya esta en uso en ese ambito.
   */
  private async ensureNameAvailable(
    userId: string,
    name: string,
    type: CategoryRow['type'],
    parentId: string | null,
    ignoreId?: string,
  ): Promise<void> {
    const existing = await this.categoriesRepository.findByNameInScope(
      userId,
      name,
      type,
      parentId,
    );
    if (existing && existing.id !== ignoreId) {
      const label = type === 'income' ? 'ingreso' : 'egreso';
      const scope = parentId ? 'subcategoría' : 'categoría';
      throw new ConflictException(`Ya tienes una ${scope} "${name}" de ${label}.`);
    }
  }

  /**
   * Lista las categorias del usuario (incluye padre/hijo y si tiene subcategorias).
   * @param userId - Dueno de las categorias.
   * @returns Las categorias.
   */
  async findAll(userId: string): Promise<CategoryResponseDto[]> {
    const [categories, counts] = await Promise.all([
      this.categoriesRepository.findAllByUser(userId),
      this.categoriesRepository.countTransactionsByUser(userId),
    ]);
    const countByCategory = new Map(counts.map((c) => [c.categoryId, c.count]));
    const parentIds = new Set(
      categories.map((c) => c.parentId).filter((id): id is string => id !== null),
    );
    return categories.map((c) =>
      this.toResponse(c, countByCategory.get(c.id) ?? 0, parentIds.has(c.id)),
    );
  }

  /**
   * Actualiza una categoria del usuario (nombre, color, meta o categoria padre).
   * @param userId - Dueno de la categoria.
   * @param id - UUID de la categoria.
   * @param dto - Campos a actualizar.
   * @returns La categoria actualizada.
   * @throws NotFoundException si no existe o no es del usuario.
   */
  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const current = await this.categoriesRepository.findByIdForUser(id, userId);
    if (!current) {
      throw new NotFoundException('Categoría no encontrada.');
    }
    const targetParentId = await this.resolveTargetParent(userId, current, dto.parentId);
    const name = dto.name?.trim() ?? current.name;
    // El tipo no se edita; se valida el duplicado contra el ambito final.
    const nameChanged = name.toLowerCase() !== current.name.toLowerCase();
    const parentChanged = targetParentId !== current.parentId;
    if (nameChanged || parentChanged) {
      await this.ensureNameAvailable(userId, name, current.type, targetParentId, id);
    }
    const updated = await this.categoriesRepository.update(id, userId, {
      name: dto.name?.trim(),
      color: dto.color,
      // undefined = no tocar; null = quitar la meta; numero = nueva meta.
      monthlyBudget: this.resolveMonthlyBudget(dto.monthlyBudget),
      // undefined = no tocar el padre; null/uuid = mover.
      parentId: dto.parentId === undefined ? undefined : targetParentId,
    });
    if (!updated) {
      throw new NotFoundException('Categoría no encontrada.');
    }
    const hasChildren = await this.categoriesRepository.hasLiveChildren(id);
    return this.toResponse(updated, 0, hasChildren);
  }

  /**
   * Resuelve y valida la categoria padre destino al editar.
   * @param userId - Dueno de la categoria.
   * @param current - Categoria que se edita.
   * @param requestedParentId - undefined (no cambia), null (a primer nivel) o uuid.
   * @returns El parentId final que debe quedar.
   * @throws BadRequestException si el movimiento viola las reglas de jerarquia.
   */
  private async resolveTargetParent(
    userId: string,
    current: CategoryRow,
    requestedParentId: string | null | undefined,
  ): Promise<string | null> {
    if (requestedParentId === undefined) return current.parentId;
    if (requestedParentId === null) return null;
    if (requestedParentId === current.id) {
      throw new BadRequestException('Una categoría no puede ser su propia categoría padre.');
    }
    if (await this.categoriesRepository.hasLiveChildren(current.id)) {
      throw new BadRequestException(
        'Esta categoría tiene subcategorías; no puede convertirse en subcategoría.',
      );
    }
    const parent = await this.resolveParent(userId, requestedParentId, current.type);
    await this.absorbDirectTransactions(userId, parent);
    return parent.id;
  }

  /**
   * Traduce la meta del DTO al valor que espera el repositorio.
   * @param value - undefined (no tocar), null (quitar) o numero (nueva meta).
   * @returns undefined, null o la meta formateada a dos decimales.
   */
  private resolveMonthlyBudget(
    value: number | null | undefined,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return value.toFixed(2);
  }

  /**
   * Elimina (soft delete) una categoria del usuario y, si es padre, sus
   * subcategorias en cascada. Los movimientos se conservan en "Otros".
   * @param userId - Dueno de la categoria.
   * @param id - UUID de la categoria.
   * @throws NotFoundException si no existe o no es del usuario.
   */
  async remove(userId: string, id: string): Promise<void> {
    const category = await this.categoriesRepository.findByIdForUser(id, userId);
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }
    // Primero las subcategorias (cada una reasigna sus movimientos a "Otros").
    const children = await this.categoriesRepository.findChildren(userId, id);
    for (const child of children) {
      await this.reassignAndSoftDelete(userId, child);
    }
    const deleted = await this.reassignAndSoftDelete(userId, category);
    if (!deleted) {
      throw new NotFoundException('Categoría no encontrada.');
    }
  }

  /**
   * Reasigna los movimientos de una categoria a "Otros" (si los tiene) y la marca
   * como eliminada.
   * @param userId - Dueno de la categoria.
   * @param category - Categoria a eliminar.
   * @returns El id eliminado, o `undefined` si no se pudo borrar.
   */
  private async reassignAndSoftDelete(
    userId: string,
    category: CategoryRow,
  ): Promise<string | undefined> {
    const isOthers =
      category.name.trim().toLowerCase() === OTHERS_CATEGORY_NAME.toLowerCase();
    if (!isOthers && (await this.categoriesRepository.hasTransactions(category.id))) {
      const others = await this.getOrCreateOthers(userId, category.type);
      await this.categoriesRepository.reassignTransactions(
        userId,
        category.id,
        others.id,
        category.name,
      );
    }
    return this.categoriesRepository.softDelete(category.id, userId);
  }

  /**
   * Obtiene la categoria "Otros" de primer nivel del tipo dado, creandola si no existe.
   * @param userId - Dueno de la categoria.
   * @param type - Tipo (income o expense) que debe heredar.
   * @returns La categoria "Otros".
   */
  private async getOrCreateOthers(
    userId: string,
    type: CategoryRow['type'],
  ): Promise<CategoryRow> {
    const existing = await this.categoriesRepository.findByNameInScope(
      userId,
      OTHERS_CATEGORY_NAME,
      type,
      null,
    );
    if (existing) {
      return existing;
    }
    return this.categoriesRepository.create(userId, {
      name: OTHERS_CATEGORY_NAME,
      type,
      parentId: null,
      color: '#6B7280',
      monthlyBudget: null,
    });
  }

  /**
   * Mapea una fila de categoria a su DTO de respuesta.
   * @param category - Fila de categoria.
   * @param transactionCount - Cantidad de movimientos asociados.
   * @param hasChildren - Si la categoria tiene subcategorias vivas.
   * @returns El DTO de respuesta.
   */
  private toResponse(
    category: CategoryRow,
    transactionCount = 0,
    hasChildren = false,
  ): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      parentId: category.parentId,
      color: category.color,
      monthlyBudget: category.monthlyBudget === null ? null : Number(category.monthlyBudget),
      createdAt: category.createdAt,
      transactionCount,
      hasChildren,
    };
  }
}
