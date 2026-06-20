import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRow, CategoriesRepository } from './categories.repository';

/** Nombre de la categoria contenedora a la que se mueven los movimientos huerfanos. */
const OTHERS_CATEGORY_NAME = 'Otros';

/** Servicio de categorias de presupuesto (CRUD aislado por usuario). */
@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  /**
   * Crea una categoria.
   * @param userId - Dueno de la categoria.
   * @param dto - Datos de la categoria.
   * @returns La categoria creada.
   */
  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const name = dto.name.trim();
    await this.ensureNameAvailable(userId, name, dto.type);
    const category = await this.categoriesRepository.create(userId, {
      name,
      type: dto.type,
      color: dto.color ?? '#0B5D3B',
      monthlyBudget: dto.monthlyBudget?.toFixed(2) ?? null,
    });
    return this.toResponse(category);
  }

  /**
   * Verifica que no exista ya otra categoria del mismo nombre y tipo.
   * @param userId - Dueno de las categorias.
   * @param name - Nombre propuesto.
   * @param type - Tipo de la categoria.
   * @param ignoreId - Id a ignorar (la propia categoria al editar).
   * @throws ConflictException si el nombre ya esta en uso para ese tipo.
   */
  private async ensureNameAvailable(
    userId: string,
    name: string,
    type: CategoryRow['type'],
    ignoreId?: string,
  ): Promise<void> {
    const existing = await this.categoriesRepository.findByNameAndType(userId, name, type);
    if (existing && existing.id !== ignoreId) {
      const label = type === 'income' ? 'ingreso' : 'egreso';
      throw new ConflictException(`Ya tienes una categoria "${name}" de ${label}.`);
    }
  }

  /**
   * Lista las categorias del usuario.
   * @param userId - Dueno de las categorias.
   * @returns Las categorias.
   */
  async findAll(userId: string): Promise<CategoryResponseDto[]> {
    const [categories, counts] = await Promise.all([
      this.categoriesRepository.findAllByUser(userId),
      this.categoriesRepository.countTransactionsByUser(userId),
    ]);
    const countByCategory = new Map(counts.map((c) => [c.categoryId, c.count]));
    return categories.map((c) => this.toResponse(c, countByCategory.get(c.id) ?? 0));
  }

  /**
   * Actualiza una categoria del usuario.
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
      throw new NotFoundException('Categoria no encontrada.');
    }
    const name = dto.name?.trim();
    // El tipo no se edita; se valida el duplicado contra el tipo actual.
    if (name && name.toLowerCase() !== current.name.toLowerCase()) {
      await this.ensureNameAvailable(userId, name, current.type, id);
    }
    const updated = await this.categoriesRepository.update(id, userId, {
      name,
      color: dto.color,
      // undefined = no tocar; null = quitar la meta; numero = nueva meta.
      monthlyBudget: this.resolveMonthlyBudget(dto.monthlyBudget),
    });
    if (!updated) {
      throw new NotFoundException('Categoria no encontrada.');
    }
    return this.toResponse(updated);
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
   * Elimina (soft delete) una categoria del usuario.
   * @param userId - Dueno de la categoria.
   * @param id - UUID de la categoria.
   * @throws NotFoundException si no existe o no es del usuario.
   */
  async remove(userId: string, id: string): Promise<void> {
    const category = await this.categoriesRepository.findByIdForUser(id, userId);
    if (!category) {
      throw new NotFoundException('Categoria no encontrada.');
    }
    // Si tiene movimientos (y no es ya "Otros"), se mueven a "Otros" conservando
    // el nombre original en la descripcion, para que sigan contando en el resumen.
    const isOthers = category.name.trim().toLowerCase() === OTHERS_CATEGORY_NAME.toLowerCase();
    if (!isOthers && (await this.categoriesRepository.hasTransactions(id))) {
      const others = await this.getOrCreateOthers(userId, category.type);
      await this.categoriesRepository.reassignTransactions(userId, id, others.id, category.name);
    }
    const deletedId = await this.categoriesRepository.softDelete(id, userId);
    if (!deletedId) {
      throw new NotFoundException('Categoria no encontrada.');
    }
  }

  /**
   * Obtiene la categoria "Otros" del tipo dado, creandola si no existe.
   * @param userId - Dueno de la categoria.
   * @param type - Tipo (income o expense) que debe heredar.
   * @returns La categoria "Otros".
   */
  private async getOrCreateOthers(
    userId: string,
    type: CategoryRow['type'],
  ): Promise<CategoryRow> {
    const existing = await this.categoriesRepository.findByNameAndType(
      userId,
      OTHERS_CATEGORY_NAME,
      type,
    );
    if (existing) {
      return existing;
    }
    return this.categoriesRepository.create(userId, {
      name: OTHERS_CATEGORY_NAME,
      type,
      color: '#6B7280',
      monthlyBudget: null,
    });
  }

  /**
   * Mapea una fila de categoria a su DTO de respuesta.
   * @param category - Fila de categoria.
   * @returns El DTO de respuesta.
   */
  private toResponse(category: CategoryRow, transactionCount = 0): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      color: category.color,
      monthlyBudget: category.monthlyBudget === null ? null : Number(category.monthlyBudget),
      createdAt: category.createdAt,
      transactionCount,
    };
  }
}
